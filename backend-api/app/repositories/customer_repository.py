from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING

class CustomerRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.customers = db.customers
        self.ledger = db.ledger_entries
        self.allocations = db.payment_allocations
        self.audits = db.audit_events

    async def get_by_id(self, shop_id: str, customer_id: str) -> Optional[Dict[str, Any]]:
        return await self.customers.find_one({"_id": customer_id, "shop_id": shop_id})

    async def create(self, customer_doc: Dict[str, Any]):
        await self.customers.insert_one(customer_doc)

    async def update(
        self,
        shop_id: str,
        customer_id: str,
        update_fields: Dict[str, Any],
        expected_version: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"_id": customer_id, "shop_id": shop_id}
        if expected_version is not None:
            query["entity_version"] = expected_version

        result = await self.customers.find_one_and_update(
            query,
            {
                "$set": update_fields,
                "$inc": {"entity_version": 1},
            },
            return_document=True,
        )
        return result

    async def list_customers(
        self,
        shop_id: str,
        status: str = "ACTIVE",
        q: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], Optional[str], bool]:
        query: Dict[str, Any] = {"shop_id": shop_id}
        if status != "ALL":
            query["status"] = status

        if q and q.strip():
            search_regex = {"$regex": q.strip(), "$options": "i"}
            query["$or"] = [
                {"name": search_regex},
                {"nickname": search_regex},
                {"phone_number": search_regex},
            ]

        if cursor:
            query["_id"] = {"$gt": cursor}

        cursor_obj = (
            self.customers.find(query)
            .sort([("_id", ASCENDING)])
            .limit(limit + 1)
        )
        docs = await cursor_obj.to_list(length=limit + 1)

        has_more = len(docs) > limit
        items = docs[:limit]
        next_cursor = items[-1]["_id"] if has_more and items else None

        return items, next_cursor, has_more

    async def calculate_balance_summary(
        self, shop_id: str, customer_id: str, credit_limit_minor: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Derives authoritative balance from posted ledger entries (Section 6.2).
        Works seamlessly now (returns 0s) and automatically reflects Phase 3 ledger entries.
        """
        cursor = self.ledger.find({
            "shop_id": shop_id,
            "customer_id": customer_id,
            "status": "POSTED",
        })
        entries = await cursor.to_list(length=None)

        total_credit = 0
        total_paid = 0
        total_allocated = 0
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        overdue_credit_ids = set()

        for entry in entries:
            etype = entry.get("type")
            amt = entry.get("amount_minor", 0)
            if etype == "CREDIT_SALE":
                total_credit += amt
                due_date = entry.get("due_date")
                if due_date and due_date < today_str:
                    overdue_credit_ids.add(entry["_id"])
            elif etype == "PAYMENT":
                total_paid += amt

        outstanding = max(0, total_credit - total_paid)

        # Calculate overdue remaining balance from allocations
        overdue_balance = 0
        if overdue_credit_ids:
            for entry in entries:
                if entry["_id"] in overdue_credit_ids:
                    alloc_cursor = self.allocations.find({
                        "shop_id": shop_id,
                        "credit_entry_id": entry["_id"],
                    })
                    allocs = await alloc_cursor.to_list(length=None)
                    allocated_sum = sum(a.get("amount_minor", 0) for a in allocs)
                    remaining = max(0, entry.get("amount_minor", 0) - allocated_sum)
                    overdue_balance += remaining

        available_credit = None
        if credit_limit_minor is not None:
            available_credit = max(0, credit_limit_minor - outstanding)

        return {
            "outstanding_balance_minor": outstanding,
            "overdue_balance_minor": overdue_balance,
            "total_credit_minor": total_credit,
            "total_paid_minor": total_paid,
            "available_credit_minor": available_credit,
        }

    async def log_audit(self, audit_doc: Dict[str, Any]):
        await self.audits.insert_one(audit_doc)