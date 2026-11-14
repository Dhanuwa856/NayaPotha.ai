from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/risk", tags=["Risk Analysis"])

@router.get("/customers/{customer_id}/latest")
async def get_customer_risk_latest(customer_id: str):
    # මෙහිදී customer ගේ overdue දින ගණන සහ credit limit usage සලකා බලා Category එක ලබාදේ:
    # LOW, MEDIUM, HIGH, INSUFFICIENT_HISTORY
    return {
        "customer_id": customer_id,
        "category": "LOW",
        "score": 85,
        "reasons": ["Good repayment track record", "Below 50% credit limit utilization"],
        "evaluated_at": datetime.utcnow().isoformat()
    }