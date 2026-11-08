from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.db.mongo import get_db
from app.dependencies.auth import get_current_context
from app.repositories.customer_repository import CustomerRepository
from app.services.customer_service import CustomerService
from app.schemas.customer import (
    CreateCustomerRequest,
    UpdateCustomerRequest,
    CustomerResponse,
    CustomerListResponse,
    CustomerBalanceSummary,
)

router = APIRouter(prefix="/customers", tags=["Customers"])

def get_customer_service(db=Depends(get_db)) -> CustomerService:
    return CustomerService(CustomerRepository(db))

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CreateCustomerRequest,
    ctx: dict = Depends(get_current_context),
    service: CustomerService = Depends(get_customer_service),
):
    return await service.create_customer(ctx["shop_id"], ctx["owner_id"], payload)

@router.get("", response_model=CustomerListResponse)
async def list_customers(
    q: Optional[str] = Query(None, description="Search by name, nickname, or phone"),
    status_filter: str = Query("ACTIVE", alias="status", pattern="^(ACTIVE|ARCHIVED|ALL)$"),
    cursor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    ctx: dict = Depends(get_current_context),
    service: CustomerService = Depends(get_customer_service),
):
    return await service.list_customers(
        shop_id=ctx["shop_id"], status=status_filter, q=q, cursor=cursor, limit=limit
    )

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    ctx: dict = Depends(get_current_context),
    service: CustomerService = Depends(get_customer_service),
):
    return await service.get_customer(ctx["shop_id"], customer_id)

@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    payload: UpdateCustomerRequest,
    ctx: dict = Depends(get_current_context),
    service: CustomerService = Depends(get_customer_service),
):
    return await service.update_customer(ctx["shop_id"], ctx["owner_id"], customer_id, payload)

@router.post("/{customer_id}/archive", response_model=CustomerResponse)
async def archive_customer(
    customer_id: str,
    ctx: dict = Depends(get_current_context),
    service: CustomerService = Depends(get_customer_service),
):
    return await service.change_status(ctx["shop_id"], ctx["owner_id"], customer_id, "ARCHIVED")

@router.post("/{customer_id}/restore", response_model=CustomerResponse)
async def restore_customer(
    customer_id: str,
    ctx: dict = Depends(get_current_context),
    service: CustomerService = Depends(get_customer_service),
):
    return await service.change_status(ctx["shop_id"], ctx["owner_id"], customer_id, "ACTIVE")

@router.get("/{customer_id}/balance", response_model=CustomerBalanceSummary)
async def get_customer_balance(
    customer_id: str,
    ctx: dict = Depends(get_current_context),
    service: CustomerService = Depends(get_customer_service),
):
    return await service.get_balance(ctx["shop_id"], customer_id)