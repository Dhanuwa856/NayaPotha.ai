from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.db.mongo import get_db
from app.dependencies.auth import get_current_context
from app.repositories.sync_repository import SyncRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.customer_service import CustomerService
from app.services.ledger_service import LedgerService
from app.services.sync_service import SyncService
from app.schemas.sync import (
    SyncPushRequest,
    SyncPushResponse,
    SyncPullResponse,
    SyncAckRequest,
    SyncStatusResponse,
)

router = APIRouter(prefix="/sync", tags=["Offline Synchronisation"])

def get_sync_service(db=Depends(get_db)) -> SyncService:
    cust_repo = CustomerRepository(db)
    ledger_repo = LedgerRepository(db)
    return SyncService(
        sync_repo=SyncRepository(db),
        customer_service=CustomerService(cust_repo),
        ledger_service=LedgerService(ledger_repo, cust_repo),
    )

@router.post("/push", response_model=SyncPushResponse)
async def push_outbox_operations(
    payload: SyncPushRequest,
    ctx: dict = Depends(get_current_context),
    service: SyncService = Depends(get_sync_service),
):
    return await service.process_push_batch(ctx["shop_id"], ctx["owner_id"], payload)

@router.get("/pull", response_model=SyncPullResponse)
async def pull_cloud_changes(
    cursor: Optional[str] = Query(None, description="ISO-8601 UTC timestamp cursor"),
    limit: int = Query(100, ge=1, le=200),
    ctx: dict = Depends(get_current_context),
    service: SyncService = Depends(get_sync_service),
):
    device_id = ctx["session"]["device_id"]
    return await service.pull_changes(ctx["shop_id"], device_id, cursor=cursor, limit=limit)

@router.get("/status", response_model=SyncStatusResponse)
async def get_sync_status(
    ctx: dict = Depends(get_current_context),
    service: SyncService = Depends(get_sync_service),
):
    session = ctx["session"]
    return await service.get_sync_status(
        shop_id=ctx["shop_id"],
        device_id=session["device_id"],
        session_status=session["status"],
    )

@router.post("/ack")
async def acknowledge_pull_cursor(
    payload: SyncAckRequest,
    ctx: dict = Depends(get_current_context),
    service: SyncService = Depends(get_sync_service),
):
    return await service.acknowledge_cursor(ctx["shop_id"], payload.device_id, payload.cursor)