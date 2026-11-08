import uuid
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from app.core.errors import AppError
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.customer_repository import CustomerRepository
from app.schemas.ledger import (
    CreateCreditSaleRequest,
    CreatePaymentRequest,
    LedgerEntryResponse,
    PaymentAllocationResponse,
    LedgerOperationResult,
    LedgerEntryListResponse,
)
from app.schemas.customer import CustomerBalanceSummary

def compute_payload_hash(payload_dict: Dict[str, Any]) -> str:
    serialized = json.dumps(payload_dict, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

def allocate_fifo_pure(
    payment_amount_minor: int,
    eligible_credits: List[Dict[str, Any]],
) -> List[Tuple[str, int]]:
    """
    Pure mathematical function for FIFO payment allocation (Section 6.3).
    Input:
      - payment_amount_minor: positive integer in LKR cents
      - eligible_credits: ordered list of dicts [{'credit_entry_id': str, 'remaining_minor': int}]
    Output:
      - List of tuples: (credit_entry_id, allocated_amount_minor)
    """
    total_outstanding = sum(c["remaining_minor"] for c in eligible_credits)
    if payment_amount_minor > total_outstanding:
        raise AppError(
            code="PAYMENT_EXCEEDS_BALANCE",
            message="Payment amount is greater than the outstanding balance.",
            status_code=422,
            details={
                "outstanding_balance_minor": total_outstanding,
                "submitted_amount_minor": payment_amount_minor,
            },
        )

    remaining_to_allocate = payment_amount_minor
    allocations: List[Tuple[str, int]] = []

    for credit in eligible_credits:
        if remaining_to_allocate <= 0:
            break
        credit_rem = credit["remaining_minor"]
        if credit_rem <= 0:
            continue
        alloc_amt = min(remaining_to_allocate, credit_rem)
        allocations.append((credit["credit_entry_id"], alloc_amt))
        remaining_to_allocate -= alloc_amt

    return allocations


class LedgerService:
    def __init__(self, ledger_repo: LedgerRepository, customer_repo: CustomerRepository):
        self.ledger_repo = ledger_repo
        self.customer_repo = customer_repo

    async def record_credit_sale(
        self, shop_id: str, owner_id: str, data: CreateCreditSaleRequest
    ) -> LedgerOperationResult:
        payload_hash = compute_payload_hash({
            "type": "CREDIT_SALE",
            "customer_id": data.customer_id,
            "amount_minor": data.amount_minor,
            "due_date": data.due_date,
        })

        # 1. Check Idempotency (Section 7.4)
        replay = await self._check_idempotency(shop_id, data.device_id, data.operation_id, payload_hash)
        if replay:
            return replay

        # 2. Verify Customer belongs to shop and is ACTIVE (Section 8.2)
        customer = await self._get_active_customer(shop_id, data.customer_id)

        now = datetime.now(timezone.utc)
        entry_id = data.entry_id or str(uuid.uuid4())

        entry_doc = {
            "_id": entry_id,
            "shop_id": shop_id,
            "customer_id": data.customer_id,
            "type": "CREDIT_SALE",
            "amount_minor": data.amount_minor,
            "note": data.note.strip() if data.note else None,
            "due_date": data.due_date,
            "occurred_at": data.occurred_at,
            "recorded_at": now,
            "created_by": owner_id,
            "operation_id": data.operation_id,
            "reversal_of": None,
            "correction_of": None,
            "status": "POSTED",
        }

        await self.ledger_repo.create_entry(entry_doc)

        summary_dict = await self.customer_repo.calculate_balance_summary(
            shop_id, data.customer_id, customer.get("credit_limit_minor")
        )
        entry_resp = await self._to_entry_response(entry_doc)
        result = LedgerOperationResult(
            entry=entry_resp,
            allocations=[],
            balance_summary=CustomerBalanceSummary(**summary_dict),
            idempotent_replay=False,
        )

        await self._save_idempotency_receipt(
            shop_id=shop_id,
            device_id=data.device_id,
            operation_id=data.operation_id,
            payload_hash=payload_hash,
            entity_id=entry_id,
            result=result,
            now=now,
        )
        return result

    async def record_payment(
        self, shop_id: str, owner_id: str, data: CreatePaymentRequest
    ) -> LedgerOperationResult:
        payload_hash = compute_payload_hash({
            "type": "PAYMENT",
            "customer_id": data.customer_id,
            "amount_minor": data.amount_minor,
        })

        # 1. Check Idempotency
        replay = await self._check_idempotency(shop_id, data.device_id, data.operation_id, payload_hash)
        if replay:
            return replay

        # 2. Verify Customer belongs to shop and is ACTIVE
        customer = await self._get_active_customer(shop_id, data.customer_id)

        # 3. Build FIFO eligible credits list (Section 6.3)
        posted_credits = await self.ledger_repo.get_posted_credits_fifo(shop_id, data.customer_id)
        eligible_credits: List[Dict[str, Any]] = []

        for c in posted_credits:
            allocated_so_far = await self.ledger_repo.get_allocated_sum_for_credit(shop_id, c["_id"])
            rem = c["amount_minor"] - allocated_so_far
            if rem > 0:
                eligible_credits.append({
                    "credit_entry_id": c["_id"],
                    "remaining_minor": rem,
                })

        # 4. Run pure FIFO allocation (validates PAYMENT_EXCEEDS_BALANCE automatically)
        fifo_pairs = allocate_fifo_pure(data.amount_minor, eligible_credits)

        now = datetime.now(timezone.utc)
        payment_entry_id = data.entry_id or str(uuid.uuid4())

        entry_doc = {
            "_id": payment_entry_id,
            "shop_id": shop_id,
            "customer_id": data.customer_id,
            "type": "PAYMENT",
            "amount_minor": data.amount_minor,
            "note": data.note.strip() if data.note else None,
            "due_date": None,
            "occurred_at": data.occurred_at,
            "recorded_at": now,
            "created_by": owner_id,
            "operation_id": data.operation_id,
            "reversal_of": None,
            "correction_of": None,
            "status": "POSTED",
        }

        allocation_docs = []
        for credit_id, alloc_amt in fifo_pairs:
            allocation_docs.append({
                "_id": str(uuid.uuid4()),
                "shop_id": shop_id,
                "payment_entry_id": payment_entry_id,
                "credit_entry_id": credit_id,
                "amount_minor": alloc_amt,
                "allocated_at": now,
            })

        await self.ledger_repo.create_entry(entry_doc)
        await self.ledger_repo.create_allocations(allocation_docs)

        summary_dict = await self.customer_repo.calculate_balance_summary(
            shop_id, data.customer_id, customer.get("credit_limit_minor")
        )
        entry_resp = await self._to_entry_response(entry_doc)
        alloc_resps = [
            PaymentAllocationResponse(
                allocation_id=a["_id"],
                shop_id=a["shop_id"],
                payment_entry_id=a["payment_entry_id"],
                credit_entry_id=a["credit_entry_id"],
                amount_minor=a["amount_minor"],
                allocated_at=a["allocated_at"],
            )
            for a in allocation_docs
        ]

        result = LedgerOperationResult(
            entry=entry_resp,
            allocations=alloc_resps,
            balance_summary=CustomerBalanceSummary(**summary_dict),
            idempotent_replay=False,
        )

        await self._save_idempotency_receipt(
            shop_id=shop_id,
            device_id=data.device_id,
            operation_id=data.operation_id,
            payload_hash=payload_hash,
            entity_id=payment_entry_id,
            result=result,
            now=now,
        )
        return result

    async def get_entry(self, shop_id: str, entry_id: str) -> LedgerEntryResponse:
        doc = await self.ledger_repo.get_entry_by_id(shop_id, entry_id)
        if not doc:
            raise AppError("LEDGER_ENTRY_NOT_FOUND", "Ledger entry not found.", 404)
        return await self._to_entry_response(doc)

    async def get_entry_allocations(self, shop_id: str, entry_id: str) -> List[PaymentAllocationResponse]:
        doc = await self.ledger_repo.get_entry_by_id(shop_id, entry_id)
        if not doc:
            raise AppError("LEDGER_ENTRY_NOT_FOUND", "Ledger entry not found.", 404)
        allocs = await self.ledger_repo.get_allocations_for_entry(shop_id, entry_id)
        return [
            PaymentAllocationResponse(
                allocation_id=a["_id"],
                shop_id=a["shop_id"],
                payment_entry_id=a["payment_entry_id"],
                credit_entry_id=a["credit_entry_id"],
                amount_minor=a["amount_minor"],
                allocated_at=a["allocated_at"],
            )
            for a in allocs
        ]

    async def list_entries(
        self,
        shop_id: str,
        customer_id: Optional[str] = None,
        entry_type: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> LedgerEntryListResponse:
        docs, next_cursor, has_more = await self.ledger_repo.list_entries(
            shop_id=shop_id,
            customer_id=customer_id,
            entry_type=entry_type,
            from_date=from_date,
            to_date=to_date,
            cursor=cursor,
            limit=limit,
        )
        items = [await self._to_entry_response(d) for d in docs]
        return LedgerEntryListResponse(items=items, next_cursor=next_cursor, has_more=has_more)

    async def _get_active_customer(self, shop_id: str, customer_id: str) -> Dict[str, Any]:
        customer = await self.customer_repo.get_by_id(shop_id, customer_id)
        if not customer:
            raise AppError("CUSTOMER_NOT_FOUND", "Customer not found in this shop.", 404)
        if customer.get("status") != "ACTIVE":
            raise AppError(
                "CUSTOMER_ARCHIVED",
                "Cannot record new transactions for an archived customer.",
                422,
            )
        return customer

    async def _check_idempotency(
        self, shop_id: str, device_id: str, operation_id: str, payload_hash: str
    ) -> Optional[LedgerOperationResult]:
        receipt = await self.ledger_repo.get_sync_receipt(shop_id, device_id, operation_id)
        if not receipt:
            existing_op = await self.ledger_repo.get_entry_by_operation_id(shop_id, operation_id)
            if existing_op:
                raise AppError(
                    "IDEMPOTENCY_KEY_REUSED",
                    "This operation_id was already used by another request.",
                    409,
                )
            return None

        if receipt.get("payload_hash") != payload_hash:
            raise AppError(
                code="IDEMPOTENCY_KEY_REUSED",
                message="Duplicate operation_id submitted with a different payload.",
                status_code=409,
            )

        snapshot = receipt["response_snapshot"]
        snapshot["idempotent_replay"] = True
        return LedgerOperationResult(**snapshot)

    async def _save_idempotency_receipt(
        self,
        shop_id: str,
        device_id: str,
        operation_id: str,
        payload_hash: str,
        entity_id: str,
        result: LedgerOperationResult,
        now: datetime,
    ):
        receipt_doc = {
            "_id": str(uuid.uuid4()),
            "shop_id": shop_id,
            "device_id": device_id,
            "operation_id": operation_id,
            "payload_hash": payload_hash,
            "entity_type": "ledger_entry",
            "entity_id": entity_id,
            "result_status": "accepted",
            "response_snapshot": result.model_dump(mode="json"),
            "processed_at": now,
        }
        await self.ledger_repo.save_sync_receipt(receipt_doc)

    async def _to_entry_response(self, doc: Dict[str, Any]) -> LedgerEntryResponse:
        remaining = None
        if doc.get("type") == "CREDIT_SALE" and doc.get("status") == "POSTED":
            allocated = await self.ledger_repo.get_allocated_sum_for_credit(doc["shop_id"], doc["_id"])
            remaining = max(0, doc["amount_minor"] - allocated)

        return LedgerEntryResponse(
            entry_id=doc["_id"],
            shop_id=doc["shop_id"],
            customer_id=doc["customer_id"],
            type=doc["type"],
            amount_minor=doc["amount_minor"],
            remaining_unpaid_minor=remaining,
            note=doc.get("note"),
            due_date=doc.get("due_date"),
            occurred_at=doc["occurred_at"],
            recorded_at=doc["recorded_at"],
            created_by=doc["created_by"],
            operation_id=doc["operation_id"],
            reversal_of=doc.get("reversal_of"),
            correction_of=doc.get("correction_of"),
            status=doc["status"],
        )