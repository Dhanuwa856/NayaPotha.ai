import uuid
from datetime import datetime, timezone
from typing import Optional
from app.core.errors import AppError
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import (
    CreateCustomerRequest,
    UpdateCustomerRequest,
    CustomerResponse,
    CustomerListResponse,
    CustomerBalanceSummary,
)

class CustomerService:
    def __init__(self, repo: CustomerRepository):
        self.repo = repo

    async def create_customer(self, shop_id: str, owner_id: str, data: CreateCustomerRequest) -> CustomerResponse:
        customer_id = data.client_id or str(uuid.uuid4())

        # Idempotency check: if client_id already exists for this shop, return canonical record
        existing = await self.repo.get_by_id(shop_id, customer_id)
        if existing:
            return await self._to_response(existing)

        now = datetime.now(timezone.utc)
        customer_doc = {
            "_id": customer_id,
            "shop_id": shop_id,
            "name": data.name.strip(),
            "nickname": data.nickname.strip() if data.nickname else None,
            "phone_number": data.phone_number,
            "notes": data.notes.strip() if data.notes else None,
            "credit_limit_minor": data.credit_limit_minor,
            "status": "ACTIVE",
            "entity_version": 1,
            "created_at": now,
            "updated_at": now,
        }

        await self.repo.create(customer_doc)
        return await self._to_response(customer_doc)

    async def get_customer(self, shop_id: str, customer_id: str) -> CustomerResponse:
        customer = await self.repo.get_by_id(shop_id, customer_id)
        if not customer:
            raise AppError("CUSTOMER_NOT_FOUND", "Customer record not found.", 404)
        return await self._to_response(customer)

    async def list_customers(
        self,
        shop_id: str,
        status: str = "ACTIVE",
        q: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> CustomerListResponse:
        docs, next_cursor, has_more = await self.repo.list_customers(
            shop_id=shop_id, status=status, q=q, cursor=cursor, limit=limit
        )
        items = [await self._to_response(doc) for doc in docs]
        return CustomerListResponse(items=items, next_cursor=next_cursor, has_more=has_more)

    async def update_customer(
        self, shop_id: str, owner_id: str, customer_id: str, data: UpdateCustomerRequest
    ) -> CustomerResponse:
        existing = await self.repo.get_by_id(shop_id, customer_id)
        if not existing:
            raise AppError("CUSTOMER_NOT_FOUND", "Customer record not found.", 404)

        update_fields = {"updated_at": datetime.now(timezone.utc)}
        if data.name is not None:
            update_fields["name"] = data.name.strip()
        if data.nickname is not None:
            update_fields["nickname"] = data.nickname.strip() or None
        if data.phone_number is not None:
            update_fields["phone_number"] = data.phone_number
        if data.notes is not None:
            update_fields["notes"] = data.notes.strip() or None
        if data.credit_limit_minor is not None:
            update_fields["credit_limit_minor"] = data.credit_limit_minor

        updated = await self.repo.update(
            shop_id=shop_id,
            customer_id=customer_id,
            update_fields=update_fields,
            expected_version=data.expected_version,
        )

        if not updated:
            raise AppError(
                code="VERSION_CONFLICT",
                message="Customer record was modified by another operation. Fetch latest version.",
                status_code=409,
                details={"current_version": existing.get("entity_version")},
            )

        return await self._to_response(updated)

    async def change_status(
        self, shop_id: str, owner_id: str, customer_id: str, target_status: str
    ) -> CustomerResponse:
        existing = await self.repo.get_by_id(shop_id, customer_id)
        if not existing:
            raise AppError("CUSTOMER_NOT_FOUND", "Customer record not found.", 404)

        now = datetime.now(timezone.utc)
        updated = await self.repo.update(
            shop_id=shop_id,
            customer_id=customer_id,
            update_fields={"status": target_status, "updated_at": now},
        )

        await self.repo.log_audit({
            "_id": str(uuid.uuid4()),
            "shop_id": shop_id,
            "actor_owner_id": owner_id,
            "action": f"CUSTOMER_{target_status}",
            "entity_type": "customer",
            "entity_id": customer_id,
            "reason": None,
            "metadata": {"previous_status": existing.get("status")},
            "occurred_at": now,
        })

        return await self._to_response(updated)

    async def get_balance(self, shop_id: str, customer_id: str) -> CustomerBalanceSummary:
        customer = await self.repo.get_by_id(shop_id, customer_id)
        if not customer:
            raise AppError("CUSTOMER_NOT_FOUND", "Customer record not found.", 404)
        summary = await self.repo.calculate_balance_summary(
            shop_id, customer_id, customer.get("credit_limit_minor")
        )
        return CustomerBalanceSummary(**summary)

    async def _to_response(self, doc: dict) -> CustomerResponse:
        summary = await self.repo.calculate_balance_summary(
            doc["shop_id"], doc["_id"], doc.get("credit_limit_minor")
        )
        return CustomerResponse(
            customer_id=doc["_id"],
            shop_id=doc["shop_id"],
            name=doc["name"],
            nickname=doc.get("nickname"),
            phone_number=doc.get("phone_number"),
            notes=doc.get("notes"),
            credit_limit_minor=doc.get("credit_limit_minor"),
            status=doc["status"],
            entity_version=doc.get("entity_version", 1),
            balance_summary=CustomerBalanceSummary(**summary),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )