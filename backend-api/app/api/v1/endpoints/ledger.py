from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from app.db.mongo import get_db
from app.dependencies.auth import get_current_context
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.customer_repository import CustomerRepository
from app.services.ledger_service import LedgerService
from app.schemas.ledger import (
    CreateCreditSaleRequest,
    CreatePaymentRequest,
    LedgerOperationResult,
    LedgerEntryResponse,
    LedgerEntryListResponse,
    PaymentAllocationResponse,
    ReverseEntryRequest,
    CorrectEntryRequest,
    CorrectionOperationResult
)

router = APIRouter(prefix="/ledger", tags=["Core Ledger & Accounting"])

def get_ledger_service(db=Depends(get_db)) -> LedgerService:
    return LedgerService(LedgerRepository(db), CustomerRepository(db))

@router.post("/credit-sales", response_model=LedgerOperationResult, status_code=status.HTTP_201_CREATED)
async def create_credit_sale(
    payload: CreateCreditSaleRequest,
    ctx: dict = Depends(get_current_context),
    service: LedgerService = Depends(get_ledger_service),
):
    return await service.record_credit_sale(ctx["shop_id"], ctx["owner_id"], payload)

@router.post("/payments", response_model=LedgerOperationResult, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: CreatePaymentRequest,
    ctx: dict = Depends(get_current_context),
    service: LedgerService = Depends(get_ledger_service),
):
    return await service.record_payment(ctx["shop_id"], ctx["owner_id"], payload)

@router.get("/entries", response_model=LedgerEntryListResponse)
async def list_ledger_entries(
    customer_id: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None, alias="type"),
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    cursor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    ctx: dict = Depends(get_current_context),
    service: LedgerService = Depends(get_ledger_service),
):
    return await service.list_entries(
        shop_id=ctx["shop_id"],
        customer_id=customer_id,
        entry_type=entry_type,
        from_date=from_date,
        to_date=to_date,
        cursor=cursor,
        limit=limit,
    )

@router.get("/entries/{entry_id}", response_model=LedgerEntryResponse)
async def get_ledger_entry(
    entry_id: str,
    ctx: dict = Depends(get_current_context),
    service: LedgerService = Depends(get_ledger_service),
):
    return await service.get_entry(ctx["shop_id"], entry_id)

@router.get("/entries/{entry_id}/allocations", response_model=List[PaymentAllocationResponse])
async def get_entry_allocations(
    entry_id: str,
    ctx: dict = Depends(get_current_context),
    service: LedgerService = Depends(get_ledger_service),
):
    return await service.get_entry_allocations(ctx["shop_id"], entry_id)

@router.post("/entries/{entry_id}/reverse", response_model=LedgerOperationResult)
async def reverse_ledger_entry(
    entry_id: str,
    payload: ReverseEntryRequest,
    ctx: dict = Depends(get_current_context),
    service: LedgerService = Depends(get_ledger_service),
):
    return await service.reverse_entry(ctx["shop_id"], ctx["owner_id"], entry_id, payload)

@router.post("/entries/{entry_id}/correct", response_model=CorrectionOperationResult)
async def correct_ledger_entry(
    entry_id: str,
    payload: CorrectEntryRequest,
    ctx: dict = Depends(get_current_context),
    service: LedgerService = Depends(get_ledger_service),
):
    return await service.correct_entry(ctx["shop_id"], ctx["owner_id"], entry_id, payload)