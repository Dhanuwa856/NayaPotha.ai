from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class SyncOperationItem(BaseModel):
    operation_id: str = Field(..., min_length=4, max_length=128)
    entity_type: str = Field(..., pattern="^(customer|ledger_entry)$")
    entity_id: str = Field(..., min_length=4, max_length=128)
    operation_type: str = Field(
        ...,
        pattern="^(CUSTOMER_UPSERT|CREATE_CREDIT_SALE|CREATE_PAYMENT|REVERSE_ENTRY|CORRECT_ENTRY)$",
    )
    schema_version: int = Field(1, ge=1)
    client_created_at: datetime
    expected_entity_version: Optional[int] = None
    payload: Dict[str, Any]

class SyncPushRequest(BaseModel):
    device_id: str = Field(..., min_length=4, max_length=128)
    batch_id: str = Field(..., min_length=4, max_length=128)
    operations: List[SyncOperationItem] = Field(..., max_length=100)

class SyncOperationOutcome(BaseModel):
    operation_id: str
    status: str  # "accepted" | "duplicate" | "rejected" | "conflict"
    entity_type: str
    entity_id: str
    server_version: Optional[int] = 1
    server_result: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None

class SyncPushResponse(BaseModel):
    batch_id: str
    processed_at: datetime
    results: List[SyncOperationOutcome]

class SyncChangeItem(BaseModel):
    entity_type: str  # "customer" | "ledger_entry" | "payment_allocation"
    entity_id: str
    updated_at: datetime
    data: Dict[str, Any]

class SyncPullResponse(BaseModel):
    changes: List[SyncChangeItem]
    next_cursor: Optional[str] = None
    has_more: bool = False

class SyncAckRequest(BaseModel):
    device_id: str = Field(..., min_length=4, max_length=128)
    cursor: str

class SyncStatusResponse(BaseModel):
    shop_id: str
    device_id: str
    session_status: str
    last_push_at: Optional[datetime] = None
    last_pull_cursor: Optional[str] = None
    last_pull_at: Optional[datetime] = None
    total_synced_operations: int = 0