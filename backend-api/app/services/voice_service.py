import uuid
import re
from datetime import datetime, timezone
from typing import Dict, Any
from app.core.errors import AppError
from app.schemas.risk_voice import VoiceDraftCreateRequest, VoiceDraftResponse, VoiceDraftPatchRequest

class VoiceService:
    def __init__(self, db):
        self.drafts = db.voice_command_drafts
        self.customers = db.customers

    async def create_draft(self, shop_id: str, data: VoiceDraftCreateRequest) -> VoiceDraftResponse:
        now = datetime.now(timezone.utc)
        draft_id = str(uuid.uuid4())
        transcript = data.transcript or ""

        # Simple heuristic parser for demo / V1 NLP simulation
        extracted: Dict[str, Any] = {"type": "CREDIT_SALE", "amount_minor": None, "customer_name": None}
        confidence = 0.85

        # Extract numbers (amounts)
        numbers = re.findall(r'\d+', transcript)
        if numbers:
            extracted["amount_minor"] = int(numbers[0]) * 100  # Convert to cents

        # Search matching customers in shop
        cursor = self.customers.find({"shop_id": shop_id, "status": "ACTIVE"})
        all_custs = await cursor.to_list(length=100)
        matched_ids = []

        for c in all_custs:
            if c["name"].lower() in transcript.lower() or (c.get("nickname") and c["nickname"].lower() in transcript.lower()):
                matched_ids.append(c["_id"])
                extracted["customer_id"] = c["_id"]
                extracted["customer_name"] = c["name"]

        if len(matched_ids) > 1:
            confidence = 0.5  # Ambiguous customer match (Section 3.8)

        doc = {
            "_id": draft_id,
            "shop_id": shop_id,
            "transcript": transcript,
            "language": data.language,
            "intent": "CREATE_CREDIT_SALE",
            "extracted_fields": extracted,
            "confidence": confidence,
            "candidate_customer_ids": matched_ids,
            "status": "PENDING",
            "created_at": now,
            "updated_at": now,
        }

        await self.drafts.insert_one(doc)
        return self._to_response(doc)

    async def get_draft(self, shop_id: str, draft_id: str) -> VoiceDraftResponse:
        doc = await self.drafts.find_one({"_id": draft_id, "shop_id": shop_id})
        if not doc:
            raise AppError("DRAFT_NOT_FOUND", "Voice command draft not found.", 404)
        return self._to_response(doc)

    async def patch_draft(self, shop_id: str, draft_id: str, data: VoiceDraftPatchRequest) -> VoiceDraftResponse:
        doc = await self.drafts.find_one({"_id": draft_id, "shop_id": shop_id})
        if not doc:
            raise AppError("DRAFT_NOT_FOUND", "Voice command draft not found.", 404)

        fields = doc.get("extracted_fields", {})
        if data.customer_id:
            fields["customer_id"] = data.customer_id
        if data.amount_minor is not None:
            fields["amount_minor"] = data.amount_minor
        if data.note:
            fields["note"] = data.note
        if data.due_date:
            fields["due_date"] = data.due_date

        now = datetime.now(timezone.utc)
        updated = await self.drafts.find_one_and_update(
            {"_id": draft_id, "shop_id": shop_id},
            {"$set": {"extracted_fields": fields, "updated_at": now}},
            return_document=True,
        )
        return self._to_response(updated)

    async def discard_draft(self, shop_id: str, draft_id: str) -> dict:
        res = await self.drafts.update_one(
            {"_id": draft_id, "shop_id": shop_id},
            {"$set": {"status": "DISCARDED", "updated_at": datetime.now(timezone.utc)}}
        )
        if res.matched_count == 0:
            raise AppError("DRAFT_NOT_FOUND", "Voice command draft not found.", 404)
        return {"status": "discarded", "draft_id": draft_id}

    def _to_response(self, doc: dict) -> VoiceDraftResponse:
        return VoiceDraftResponse(
            draft_id=doc["_id"],
            shop_id=doc["shop_id"],
            transcript=doc.get("transcript"),
            language=doc["language"],
            intent=doc.get("intent"),
            extracted_fields=doc["extracted_fields"],
            confidence=doc["confidence"],
            candidate_customer_ids=doc.get("candidate_customer_ids", []),
            status=doc["status"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )