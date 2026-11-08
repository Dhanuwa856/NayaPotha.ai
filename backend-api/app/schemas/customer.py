import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.schemas.auth import normalize_sl_phone

class CreateCustomerRequest(BaseModel):
    client_id: Optional[str] = Field(None, description="Client-generated UUID for offline-first idempotency")
    name: str = Field(..., min_length=1, max_length=120)
    nickname: Optional[str] = Field(None, max_length=60)
    phone_number: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)
    credit_limit_minor: Optional[int] = Field(None, ge=0, description="Optional credit limit in LKR cents")

    @field_validator("phone_number")
    @classmethod
    def validate_optional_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        return normalize_sl_phone(v)

class UpdateCustomerRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    nickname: Optional[str] = Field(None, max_length=60)
    phone_number: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)
    credit_limit_minor: Optional[int] = Field(None, ge=0)
    expected_version: Optional[int] = Field(None, ge=1, description="For conflict detection (409)")

    @field_validator("phone_number")
    @classmethod
    def validate_optional_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        return normalize_sl_phone(v)

class CustomerBalanceSummary(BaseModel):
    outstanding_balance_minor: int = 0
    overdue_balance_minor: int = 0
    total_credit_minor: int = 0
    total_paid_minor: int = 0
    available_credit_minor: Optional[int] = None

class CustomerResponse(BaseModel):
    customer_id: str
    shop_id: str
    name: str
    nickname: Optional[str] = None
    phone_number: Optional[str] = None
    notes: Optional[str] = None
    credit_limit_minor: Optional[int] = None
    status: str
    entity_version: int
    balance_summary: CustomerBalanceSummary
    created_at: datetime
    updated_at: datetime

class CustomerListResponse(BaseModel):
    items: List[CustomerResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False