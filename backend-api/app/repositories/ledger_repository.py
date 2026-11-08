from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

class LedgerRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.ledger = db.ledger_entries
        self.allocations = db.payment_allocations
        self.receipts = db.sync_receipts
        self.audits = db.audit_events

    async def get_entry_by_id(self, shop_id: str, entry_id: str) -> Optional[Dict[str, Any]]:
        return await self.ledger.find_one({"_id": entry_id, "shop_id": shop_id})

    async def get_entry_by_operation_id(self, shop_id: str, operation_id: str) -> Optional[Dict[str, Any]]:
        return await self.ledger.find_one({"shop_id": shop_id, "operation_id": operation_id})

    async def get_sync_receipt(self, shop_id: str, device_id: str, operation_id: str) -> Optional[Dict[str, Any]]:
        return await self.receipts.find_one({
            "shop_id": shop_id,
            "device_id": device_id,
            "operation_id": operation_id,
        })

    async def save_sync_receipt(self, receipt_doc: Dict[str, Any]):
        await self.receipts.insert_one(receipt_doc)

    async def create_entry(self, entry_doc: Dict[str, Any]):
        await self.ledger.insert_one(entry_doc)

    async def create_allocations(self, allocation_docs: List[Dict[str, Any]]):
        if allocation_docs:
            await self.allocations.insert_many(allocation_docs)

    async def get_allocations_for_entry(self, shop_id: str, entry_id: str) -> List[Dict[str, Any]]:
        cursor = self.allocations.find({
            "shop_id": shop_id,
            "$or": [{"payment_entry_id": entry_id}, {"credit_entry_id": entry_id}],
        }).sort([("allocated_at", ASCENDING), ("_id", ASCENDING)])
        return await cursor.to_list(length=None)

    async def get_allocated_sum_for_credit(self, shop_id: str, credit_entry_id: str) -> int:
        cursor = self.allocations.find({
            "shop_id": shop_id,
            "credit_entry_id": credit_entry_id,
        })
        allocs = await cursor.to_list(length=None)
        return sum(a.get("amount_minor", 0) for a in allocs)

    async def get_posted_credits_fifo(self, shop_id: str, customer_id: str) -> List[Dict[str, Any]]:
        """
        Fetches all POSTED credit sales for a customer ordered oldest first:
        occurred_at ASC, recorded_at ASC, _id ASC (Section 6.3).
        """
        cursor = self.ledger.find({
            "shop_id": shop_id,
            "customer_id": customer_id,
            "type": "CREDIT_SALE",
            "status": "POSTED",
        }).sort([
            ("occurred_at", ASCENDING),
            ("recorded_at", ASCENDING),
            ("_id", ASCENDING),
        ])
        return await cursor.to_list(length=None)

    async def list_entries(
        self,
        shop_id: str,
        customer_id: Optional[str] = None,
        entry_type: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], Optional[str], bool]:
        query: Dict[str, Any] = {"shop_id": shop_id}
        if customer_id:
            query["customer_id"] = customer_id
        if entry_type:
            query["type"] = entry_type
        if from_date or to_date:
            date_filter: Dict[str, Any] = {}
            if from_date:
                date_filter["$gte"] = from_date
            if to_date:
                date_filter["$lte"] = to_date
            query["occurred_at"] = date_filter

        if cursor:
            query["_id"] = {"$gt": cursor}

        cursor_obj = (
            self.ledger.find(query)
            .sort([("occurred_at", DESCENDING), ("_id", ASCENDING)])
            .limit(limit + 1)
        )
        docs = await cursor_obj.to_list(length=limit + 1)
        has_more = len(docs) > limit
        items = docs[:limit]
        next_cursor = items[-1]["_id"] if has_more and items else None
        return items, next_cursor, has_more
    
    async def mark_entry_reversed(self, shop_id: str, entry_id: str):
        await self.ledger.update_one(
            {"_id": entry_id, "shop_id": shop_id},
            {"$set": {"status": "REVERSED"}},
        )

    async def delete_allocations_for_payment(self, shop_id: str, payment_entry_id: str):
        await self.allocations.delete_many({
            "shop_id": shop_id,
            "payment_entry_id": payment_entry_id,
        })

    async def find_reversal_of(self, shop_id: str, original_entry_id: str) -> Optional[Dict[str, Any]]:
        return await self.ledger.find_one({
            "shop_id": shop_id,
            "reversal_of": original_entry_id,
        })

    async def log_audit(self, audit_doc: Dict[str, Any]):
        await self.audits.insert_one(audit_doc)