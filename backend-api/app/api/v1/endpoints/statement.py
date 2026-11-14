from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/customers", tags=["Statement & Ledger Summary"])

class StatementEntryItem(BaseModel):
    entry_id: str
    type: str # 'CREDIT_SALE', 'PAYMENT', 'REVERSAL'
    amount_minor: int
    remaining_unpaid_minor: Optional[int] = None
    note: Optional[str] = None
    due_date: Optional[str] = None
    occurred_at: datetime
    status: str
    operation_id: str

class StatementResponse(BaseModel):
    customer_id: str
    items: List[StatementEntryItem]
    total_count: int

@router.get("/{customer_id}/statement", response_model=StatementResponse)
async def get_customer_statement(
    customer_id: str,
    limit: int = Query(50, ge=1, le=100),
    # current_user = Depends(get_current_user), db = Depends(get_db)
):
    # MongoDB හෝ SQL query මගින් customer_id ට අදාළ entries 'occurred_at' DESC අනුපිළිවෙලට ලබාගැනීම
    # entries = await db.ledger_entries.find({"customer_id": customer_id}).sort("occurred_at", -1).limit(limit).to_list()
    
    # Example Response structure:
    return {
        "customer_id": customer_id,
        "items": [], # db entries
        "total_count": 0
    }

@router.get("/{customer_id}/ledger-summary")
async def get_customer_ledger_summary(customer_id: str):
    # මුළු ණය, ගෙවීම් සහ දැනට ශේෂය ගණනය කිරීම
    return {
        "customer_id": customer_id,
        "outstanding_balance_minor": 0,
        "total_credit_minor": 0,
        "total_paid_minor": 0,
        "overdue_balance_minor": 0
    }