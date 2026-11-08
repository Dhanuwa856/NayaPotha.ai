from pymongo import ASCENDING, DESCENDING
from app.db.mongo import get_db

async def create_indexes():
    db = get_db()

    # 1. owner_accounts
    await db.owner_accounts.create_index([("phone_e164", ASCENDING)], unique=True)
    await db.owner_accounts.create_index([("email", ASCENDING)], unique=True, sparse=True)

    # 2. shops (Enforce 1:1 one shop per owner)
    await db.shops.create_index([("owner_id", ASCENDING)], unique=True)

    # 3. device_sessions
    await db.device_sessions.create_index([("shop_id", ASCENDING), ("status", ASCENDING)])

    # 4. customers
    await db.customers.create_index([("shop_id", ASCENDING), ("status", ASCENDING), ("name", ASCENDING)])
    await db.customers.create_index([("shop_id", ASCENDING), ("phone_number", ASCENDING)])

    # 5. ledger_entries (Customer statement ordering & Idempotency)
    await db.ledger_entries.create_index([
        ("shop_id", ASCENDING),
        ("customer_id", ASCENDING),
        ("occurred_at", ASCENDING),
        ("_id", ASCENDING),
    ])
    await db.ledger_entries.create_index([("shop_id", ASCENDING), ("operation_id", ASCENDING)], unique=True)

    # 6. payment_allocations (FIFO tracking)
    await db.payment_allocations.create_index([("shop_id", ASCENDING), ("credit_entry_id", ASCENDING)])
    await db.payment_allocations.create_index([("shop_id", ASCENDING), ("payment_entry_id", ASCENDING)])

    # 7. sync_receipts (Idempotent offline sync)
    await db.sync_receipts.create_index(
        [("shop_id", ASCENDING), ("device_id", ASCENDING), ("operation_id", ASCENDING)],
        unique=True,
    )

    # 8. risk_assessments & audit_events
    await db.risk_assessments.create_index([("shop_id", ASCENDING), ("customer_id", ASCENDING), ("assessed_at", DESCENDING)])
    await db.audit_events.create_index([("shop_id", ASCENDING), ("entity_type", ASCENDING), ("entity_id", ASCENDING), ("occurred_at", ASCENDING)])