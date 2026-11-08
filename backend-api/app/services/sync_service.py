import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import ValidationError
from app.core.errors import AppError
from app.repositories.sync_repository import SyncRepository
from app.services.customer_service import CustomerService
from app.services.ledger_service import LedgerService, compute_payload_hash
from app.schemas.customer import CreateCustomerRequest, UpdateCustomerRequest
from app.schemas.ledger import (
    CreateCreditSaleRequest,
    CreatePaymentRequest,
    ReverseEntryRequest,
    CorrectEntryRequest,
)
from app.schemas.sync import (
    SyncPushRequest,
    SyncPushResponse,
    SyncOperationItem,
    SyncOperationOutcome,
    SyncPullResponse,
    SyncChangeItem,
    SyncStatusResponse,
)

class SyncService:
    def __init__(
        self,
        sync_repo: SyncRepository,
        customer_service: CustomerService,
        ledger_service: LedgerService,
    ):
        self.sync_repo = sync_repo
        self.customer_service = customer_service
        self.ledger_service = ledger_service

    async def process_push_batch(
        self, shop_id: str, owner_id: str, data: SyncPushRequest
    ) -> SyncPushResponse:
        outcomes = []
        now = datetime.now(timezone.utc)

        for op in data.operations:
            outcome = await self._process_single_operation(
                shop_id=shop_id,
                owner_id=owner_id,
                device_id=data.device_id,
                op=op,
                now=now,
            )
            outcomes.append(outcome)

        return SyncPushResponse(
            batch_id=data.batch_id,
            processed_at=now,
            results=outcomes,
        )

    async def _process_single_operation(
        self,
        shop_id: str,
        owner_id: str,
        device_id: str,
        op: SyncOperationItem,
        now: datetime,
    ) -> SyncOperationOutcome:
        payload_hash = compute_payload_hash({
            "entity_type": op.entity_type,
            "entity_id": op.entity_id,
            "operation_type": op.operation_type,
            "payload": op.payload,
        })

        # 1. Check existing sync_receipt for this operation_id
        existing_receipt = await self.sync_repo.get_receipt(shop_id, device_id, op.operation_id)
        if existing_receipt:
            if existing_receipt.get("payload_hash") != payload_hash:
                return SyncOperationOutcome(
                    operation_id=op.operation_id,
                    status="rejected",
                    entity_type=op.entity_type,
                    entity_id=op.entity_id,
                    error_code="IDEMPOTENCY_KEY_REUSED",
                    error_message="Duplicate operation_id submitted with a different payload.",
                )
            snapshot = existing_receipt.get("response_snapshot", {})
            return SyncOperationOutcome(
                operation_id=op.operation_id,
                status="duplicate",
                entity_type=op.entity_type,
                entity_id=op.entity_id,
                server_version=snapshot.get("server_version", 1),
                server_result=snapshot.get("server_result", snapshot),
            )

        # 2. Dispatch operation to the appropriate domain service
        try:
            if op.operation_type == "CUSTOMER_UPSERT":
                outcome = await self._handle_customer_upsert(shop_id, owner_id, device_id, op, payload_hash, now)
            elif op.operation_type == "CREATE_CREDIT_SALE":
                outcome = await self._handle_credit_sale(shop_id, owner_id, device_id, op)
            elif op.operation_type == "CREATE_PAYMENT":
                outcome = await self._handle_payment(shop_id, owner_id, device_id, op)
            elif op.operation_type == "REVERSE_ENTRY":
                outcome = await self._handle_reversal(shop_id, owner_id, device_id, op)
            elif op.operation_type == "CORRECT_ENTRY":
                outcome = await self._handle_correction(shop_id, owner_id, device_id, op, payload_hash, now)
            else:
                outcome = SyncOperationOutcome(
                    operation_id=op.operation_id,
                    status="rejected",
                    entity_type=op.entity_type,
                    entity_id=op.entity_id,
                    error_code="UNSUPPORTED_OPERATION",
                    error_message=f"Unsupported operation_type: {op.operation_type}",
                )
            return outcome

        except AppError as exc:
            status_label = "conflict" if exc.status_code == 409 else "rejected"
            return SyncOperationOutcome(
                operation_id=op.operation_id,
                status=status_label,
                entity_type=op.entity_type,
                entity_id=op.entity_id,
                error_code=exc.code,
                error_message=exc.message,
                server_result=exc.details or None,
            )
        except ValidationError as verr:
            return SyncOperationOutcome(
                operation_id=op.operation_id,
                status="rejected",
                entity_type=op.entity_type,
                entity_id=op.entity_id,
                error_code="VALIDATION_ERROR",
                error_message=str(verr.errors()[0].get("msg", "Invalid payload")),
            )

    async def _handle_customer_upsert(
        self, shop_id: str, owner_id: str, device_id: str, op: SyncOperationItem, payload_hash: str, now: datetime
    ) -> SyncOperationOutcome:
        existing = await self.customer_service.repo.get_by_id(shop_id, op.entity_id)
        if not existing:
            req = CreateCustomerRequest(client_id=op.entity_id, **op.payload)
            res = await self.customer_service.create_customer(shop_id, owner_id, req)
        else:
            req = UpdateCustomerRequest(
                expected_version=op.expected_entity_version,
                **op.payload,
            )
            res = await self.customer_service.update_customer(shop_id, owner_id, op.entity_id, req)

        server_result = {
            "customer_id": res.customer_id,
            "entity_version": res.entity_version,
            "outstanding_balance_minor": res.balance_summary.outstanding_balance_minor,
        }
        await self.sync_repo.save_receipt({
            "_id": str(uuid.uuid4()),
            "shop_id": shop_id,
            "device_id": device_id,
            "operation_id": op.operation_id,
            "payload_hash": payload_hash,
            "entity_type": "customer",
            "entity_id": op.entity_id,
            "result_status": "accepted",
            "response_snapshot": {
                "server_version": res.entity_version,
                "server_result": server_result,
            },
            "processed_at": now,
        })
        return SyncOperationOutcome(
            operation_id=op.operation_id,
            status="accepted",
            entity_type="customer",
            entity_id=op.entity_id,
            server_version=res.entity_version,
            server_result=server_result,
        )

    async def _handle_credit_sale(
        self, shop_id: str, owner_id: str, device_id: str, op: SyncOperationItem
    ) -> SyncOperationOutcome:
        req = CreateCreditSaleRequest(
            operation_id=op.operation_id,
            entry_id=op.entity_id,
            device_id=device_id,
            **op.payload,
        )
        res = await self.ledger_service.record_credit_sale(shop_id, owner_id, req)
        return SyncOperationOutcome(
            operation_id=op.operation_id,
            status="duplicate" if res.idempotent_replay else "accepted",
            entity_type="ledger_entry",
            entity_id=res.entry.entry_id,
            server_version=1,
            server_result={
                "entry_id": res.entry.entry_id,
                "outstanding_balance_minor": res.balance_summary.outstanding_balance_minor,
            },
        )

    async def _handle_payment(
        self, shop_id: str, owner_id: str, device_id: str, op: SyncOperationItem
    ) -> SyncOperationOutcome:
        req = CreatePaymentRequest(
            operation_id=op.operation_id,
            entry_id=op.entity_id,
            device_id=device_id,
            **op.payload,
        )
        res = await self.ledger_service.record_payment(shop_id, owner_id, req)
        return SyncOperationOutcome(
            operation_id=op.operation_id,
            status="duplicate" if res.idempotent_replay else "accepted",
            entity_type="ledger_entry",
            entity_id=res.entry.entry_id,
            server_version=1,
            server_result={
                "entry_id": res.entry.entry_id,
                "allocations_count": len(res.allocations),
                "outstanding_balance_minor": res.balance_summary.outstanding_balance_minor,
            },
        )

    async def _handle_reversal(
        self, shop_id: str, owner_id: str, device_id: str, op: SyncOperationItem
    ) -> SyncOperationOutcome:
        target_entry_id = op.payload.get("target_entry_id") or op.entity_id
        req = ReverseEntryRequest(
            operation_id=op.operation_id,
            reason=op.payload.get("reason", "Offline reversal"),
            occurred_at=op.payload.get("occurred_at", op.client_created_at),
            device_id=device_id,
        )
        res = await self.ledger_service.reverse_entry(shop_id, owner_id, target_entry_id, req)
        return SyncOperationOutcome(
            operation_id=op.operation_id,
            status="duplicate" if res.idempotent_replay else "accepted",
            entity_type="ledger_entry",
            entity_id=res.entry.entry_id,
            server_version=1,
            server_result={
                "reversal_entry_id": res.entry.entry_id,
                "outstanding_balance_minor": res.balance_summary.outstanding_balance_minor,
            },
        )

    async def _handle_correction(
        self, shop_id: str, owner_id: str, device_id: str, op: SyncOperationItem, payload_hash: str, now: datetime
    ) -> SyncOperationOutcome:
        target_entry_id = op.payload.get("target_entry_id") or op.entity_id
        req = CorrectEntryRequest(
            operation_id=op.operation_id,
            reason=op.payload.get("reason", "Offline correction"),
            occurred_at=op.payload.get("occurred_at", op.client_created_at),
            device_id=device_id,
            replacement_entry=op.payload["replacement_entry"],
        )
        res = await self.ledger_service.correct_entry(shop_id, owner_id, target_entry_id, req)
        server_result = {
            "reversed_entry_id": res.reversed_entry_id,
            "reversal_entry_id": res.reversal_entry.entry_id,
            "replacement_entry_id": res.replacement_entry.entry_id,
            "outstanding_balance_minor": res.balance_summary.outstanding_balance_minor,
        }
        await self.sync_repo.save_receipt({
            "_id": str(uuid.uuid4()),
            "shop_id": shop_id,
            "device_id": device_id,
            "operation_id": op.operation_id,
            "payload_hash": payload_hash,
            "entity_type": "ledger_entry",
            "entity_id": res.replacement_entry.entry_id,
            "result_status": "accepted",
            "response_snapshot": {"server_version": 1, "server_result": server_result},
            "processed_at": now,
        })
        return SyncOperationOutcome(
            operation_id=op.operation_id,
            status="accepted",
            entity_type="ledger_entry",
            entity_id=res.replacement_entry.entry_id,
            server_version=1,
            server_result=server_result,
        )

    async def pull_changes(
        self, shop_id: str, device_id: str, cursor: Optional[str] = None, limit: int = 100
    ) -> SyncPullResponse:
        since_dt: Optional[datetime] = None
        if cursor:
            try:
                normalized = cursor.replace("Z", "+00:00")
                since_dt = datetime.fromisoformat(normalized)
            except ValueError:
                raise AppError("INVALID_CURSOR", "Cursor must be a valid ISO-8601 timestamp.", 400)

        items, next_cursor, has_more = await self.sync_repo.pull_changes_since(
            shop_id=shop_id, since_dt=since_dt, limit=limit
        )
        if next_cursor:
            await self.sync_repo.update_cursor(
                shop_id, device_id, next_cursor, datetime.now(timezone.utc)
            )

        return SyncPullResponse(
            changes=[SyncChangeItem(**item) for item in items],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def acknowledge_cursor(self, shop_id: str, device_id: str, cursor: str) -> dict:
        now = datetime.now(timezone.utc)
        await self.sync_repo.update_cursor(shop_id, device_id, cursor, now)
        return {"status": "acknowledged", "cursor": cursor, "updated_at": now}

    async def get_sync_status(self, shop_id: str, device_id: str, session_status: str) -> SyncStatusResponse:
        stats = await self.sync_repo.get_device_sync_stats(shop_id, device_id)
        return SyncStatusResponse(
            shop_id=shop_id,
            device_id=device_id,
            session_status=session_status,
            **stats,
        )