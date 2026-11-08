from fastapi import APIRouter, Depends, status
from app.db.mongo import get_db
from app.dependencies.auth import get_current_context
from app.services.risk_service import RiskService
from app.services.voice_service import VoiceService
from app.schemas.risk_voice import (
    RiskAssessmentResponse,
    VoiceDraftCreateRequest,
    VoiceDraftResponse,
    VoiceDraftPatchRequest,
)

router = APIRouter(tags=["Risk & Voice Intelligence"])

@router.post("/risk/customers/{customer_id}/assess", response_model=RiskAssessmentResponse)
async def assess_customer_risk(
    customer_id: str,
    ctx: dict = Depends(get_current_context),
    db=Depends(get_db),
):
    service = RiskService(db)
    return await service.assess_customer_risk(ctx["shop_id"], customer_id)

@router.get("/risk/customers/{customer_id}/latest", response_model=RiskAssessmentResponse)
async def get_latest_customer_risk(
    customer_id: str,
    ctx: dict = Depends(get_current_context),
    db=Depends(get_db),
):
    service = RiskService(db)
    return await service.get_latest_risk(ctx["shop_id"], customer_id)

@router.post("/voice/drafts", response_model=VoiceDraftResponse, status_code=status.HTTP_201_CREATED)
async def create_voice_draft(
    payload: VoiceDraftCreateRequest,
    ctx: dict = Depends(get_current_context),
    db=Depends(get_db),
):
    service = VoiceService(db)
    return await service.create_draft(ctx["shop_id"], payload)

@router.get("/voice/drafts/{draft_id}", response_model=VoiceDraftResponse)
async def get_voice_draft(
    draft_id: str,
    ctx: dict = Depends(get_current_context),
    db=Depends(get_db),
):
    service = VoiceService(db)
    return await service.get_draft(ctx["shop_id"], draft_id)

@router.patch("/voice/drafts/{draft_id}", response_model=VoiceDraftResponse)
async def patch_voice_draft(
    draft_id: str,
    payload: VoiceDraftPatchRequest,
    ctx: dict = Depends(get_current_context),
    db=Depends(get_db),
):
    service = VoiceService(db)
    return await service.patch_draft(ctx["shop_id"], draft_id, payload)

@router.post("/voice/drafts/{draft_id}/discard")
async def discard_voice_draft(
    draft_id: str,
    ctx: dict = Depends(get_current_context),
    db=Depends(get_db),
):
    service = VoiceService(db)
    return await service.discard_draft(ctx["shop_id"], draft_id)