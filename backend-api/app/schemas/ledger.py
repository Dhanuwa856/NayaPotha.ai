import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.schemas.customer import CustomerBalanceSummary

class CreateCreditSaleRequest(BaseModel):
    operation_id: str = Field(..., min_length=4, max_length=128)
    entry_id: Optional[str] = Field(None, description="Optional client-generated UUID for ledger entry")
    customer_id: str
    amount_minor: int = Field(..., gt=0, description="Amount in LKR cents (must be > 0)")
    note: Optional[str] = Field(None, max_length=500)
    due_date: Optional[str] = Field(None, description="YYYY-MM-DD local calendar date")
    occurred_at: datetime
    device_id: str = Field(..., min_length=4, max_length=128)

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("due_date must be in YYYY-MM-DD format")
        return v

class CreatePaymentRequest(BaseModel):
    operation_id: str = Field(..., min_length=4, max_length=128)
    entry_id: Optional[str] = Field(None, description="Optional client-generated UUID for ledger entry")
    customer_id: str
    amount_minor: int = Field(..., gt=0, description="Payment amount in LKR cents (must be > 0)")
    note: Optional[str] = Field(None, max_length=500)
    occurred_at: datetime
    device_id: str = Field(..., min_length=4, max_length=128)

class PaymentAllocationResponse(BaseModel):
    allocation_id: str
    shop_id: str
    payment_entry_id: str
    credit_entry_id: str
    amount_minor: int
    allocated_at: datetime

class LedgerEntryResponse(BaseModel):
    entry_id: str
    shop_id: str
    customer_id: str
    type: str
    amount_minor: int
    remaining_unpaid_minor: Optional[int] = None
    note: Optional[str] = None
    due_date: Optional[str] = None
    occurred_at: datetime
    recorded_at: datetime
    created_by: str
    operation_id: str
    reversal_of: Optional[str] = None
    correction_of: Optional[str] = None
    status: str

class LedgerOperationResult(BaseModel):
    entry: LedgerEntryResponse
    allocations: List[PaymentAllocationResponse] = []
    balance_summary: CustomerBalanceSummary
    idempotent_replay: bool = False

class LedgerEntryListResponse(BaseModel):
    items: List[LedgerEntryResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False
    
    
class ReverseEntryRequest(BaseModel):
    operation_id: str = Field(..., min_length=4, max_length=128)
    reason: str = Field(..., min_length=3, max_length=500, description="Mandatory audit reason for reversal")
    occurred_at: datetime
    device_id: str = Field("server-default", min_length=4, max_length=128)

class ReplacementEntryDraft(BaseModel):
    amount_minor: int = Field(..., gt=0, description="Corrected amount in LKR cents")
    note: Optional[str] = Field(None, max_length=500)
    due_date: Optional[str] = Field(None, description="YYYY-MM-DD (only for CREDIT_SALE)")

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("due_date must be in YYYY-MM-DD format")
        return v

class CorrectEntryRequest(BaseModel):
    operation_id: str = Field(..., min_length=4, max_length=128)
    reason: str = Field(..., min_length=3, max_length=500, description="Mandatory reason for correction")
    occurred_at: datetime
    device_id: str = Field("server-default", min_length=4, max_length=128)
    replacement_entry: ReplacementEntryDraft

class CorrectionOperationResult(BaseModel):
    reversed_entry_id: str
    reversal_entry: LedgerEntryResponse
    replacement_entry: LedgerEntryResponse
    allocations: List[PaymentAllocationResponse] = []
    balance_summary: CustomerBalanceSummary
    idempotent_replay: bool = False    