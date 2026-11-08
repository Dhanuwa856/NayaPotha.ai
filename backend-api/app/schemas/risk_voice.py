from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class RiskAssessmentResponse(BaseModel):
    assessment_id: str
    shop_id: str
    customer_id: str
    category: str  # "LOW" | "MEDIUM" | "HIGH"
    score: Optional[float] = None
    reasons: List[str]
    rule_version: str
    assessed_at: datetime

class VoiceDraftCreateRequest(BaseModel):
    model_config = {"extra": "allow"}
    transcript: Optional[str] = None
    language: str = Field("si", pattern="^(si|en)$")
    raw_intent: Optional[str] = None

class VoiceDraftResponse(BaseModel):
    draft_id: str
    shop_id: str
    transcript: Optional[str] = None
    language: str
    intent: Optional[str] = None
    extracted_fields: Dict[str, Any]
    confidence: float
    candidate_customer_ids: List[str] = []
    status: str  # "PENDING" | "CONFIRMED" | "DISCARDED"
    created_at: datetime
    updated_at: datetime

class VoiceDraftPatchRequest(BaseModel):
    customer_id: Optional[str] = None
    amount_minor: Optional[int] = Field(None, gt=0)
    note: Optional[str] = Field(None, max_length=500)
    due_date: Optional[str] = None