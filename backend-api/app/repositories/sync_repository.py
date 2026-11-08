from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

class SyncRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.receipts = db.sync_receipts
        self.cursors = db.sync_cursors
        self.customers = db.customers
        self.ledger = db.ledger_entries
        self.allocations = db.payment_allocations

    async def get_receipt(self, shop_id: str, device_id: str, operation_id: str) -> Optional[Dict[str, Any]]:
        return await self.receipts.find_one({
            "shop_id": shop_id,
            "device_id": device_id,
            "operation_id": operation_id,
        })

    async def save_receipt(self, receipt_doc: Dict[str, Any]):
        await self.receipts.insert_one(receipt_doc)

    async def update_cursor(self, shop_id: str, device_id: str, cursor_value: str, now: datetime):
        await self.cursors.update_one(
            {"shop_id": shop_id, "device_id": device_id},
            {
                "$set": {
                    "cursor_value": cursor_value,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "_id": f"{shop_id}_{device_id}",
                    "shop_id": shop_id,
                    "device_id": device_id,
                },
            },
            upsert=True,
        )

    async def get_device_sync_stats(self, shop_id: str, device_id: str) -> Dict[str, Any]:
        last_receipt = await self.receipts.find_one(
            {"shop_id": shop_id, "device_id": device_id},
            sort=[("processed_at", DESCENDING)],
        )
        total_ops = await self.receipts.count_documents({"shop_id": shop_id, "device_id": device_id})
        cursor_doc = await self.cursors.find_one({"shop_id": shop_id, "device_id": device_id})

        return {
            "last_push_at": last_receipt["processed_at"] if last_receipt else None,
            "last_pull_cursor": cursor_doc["cursor_value"] if cursor_doc else None,
            "last_pull_at": cursor_doc["updated_at"] if cursor_doc else None,
            "total_synced_operations": total_ops,
        }

    async def pull_changes_since(
        self, shop_id: str, since_dt: Optional[datetime], limit: int = 100
    ) -> Tuple[List[Dict[str, Any]], Optional[str], bool]:
        """
        Collects modified customers, posted/reversed ledger entries, and allocations
        since `since_dt`, ordered chronologically.
        """
        cust_query: Dict[str, Any] = {"shop_id": shop_id}
        ledger_query: Dict[str, Any] = {"shop_id": shop_id}
        alloc_query: Dict[str, Any] = {"shop_id": shop_id}

        if since_dt:
            cust_query["updated_at"] = {"$gt": since_dt}
            ledger_query["recorded_at"] = {"$gt": since_dt}
            alloc_query["allocated_at"] = {"$gt": since_dt}

        customers = await self.customers.find(cust_query).sort("updated_at", ASCENDING).limit(limit).to_list(limit)
        entries = await self.ledger.find(ledger_query).sort("recorded_at", ASCENDING).limit(limit).to_list(limit)
        allocs = await self.allocations.find(alloc_query).sort("allocated_at", ASCENDING).limit(limit).to_list(limit)

        combined: List[Dict[str, Any]] = []

        for c in customers:
            ts = c.get("updated_at") or c.get("created_at")
            c_copy = dict(c)
            c_copy["customer_id"] = c_copy.pop("_id")
            combined.append({
                "entity_type": "customer",
                "entity_id": c_copy["customer_id"],
                "updated_at": ts,
                "data": c_copy,
            })

        for e in entries:
            ts = e.get("recorded_at") or e.get("occurred_at")
            e_copy = dict(e)
            e_copy["entry_id"] = e_copy.pop("_id")
            combined.append({
                "entity_type": "ledger_entry",
                "entity_id": e_copy["entry_id"],
                "updated_at": ts,
                "data": e_copy,
            })

        for a in allocs:
            ts = a.get("allocated_at")
            a_copy = dict(a)
            a_copy["allocation_id"] = a_copy.pop("_id")
            combined.append({
                "entity_type": "payment_allocation",
                "entity_id": a_copy["allocation_id"],
                "updated_at": ts,
                "data": a_copy,
            })

        combined.sort(key=lambda x: x["updated_at"])
        has_more = len(combined) > limit
        sliced = combined[:limit]

        if sliced:
            last_dt: datetime = sliced[-1]["updated_at"]
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            next_cursor = last_dt.isoformat()
        else:
            next_cursor = since_dt.isoformat() if since_dt else None

        return sliced, next_cursor, has_more