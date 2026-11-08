from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.db.mongo import get_db
from app.dependencies.auth import get_current_context
from app.schemas.shop import UpdateOwnerRequest
from app.schemas.auth import OwnerResponse

router = APIRouter(prefix="/owners", tags=["Owner & Shop"])

@router.patch("/me", response_model=OwnerResponse)
async def update_owner_profile(
    payload: UpdateOwnerRequest,
    ctx: dict = Depends(get_current_context),
    db=Depends(get_db),
):
    updates = {"updated_at": datetime.now(timezone.utc)}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.email is not None:
        updates["email"] = payload.email

    updated = await db.owner_accounts.find_one_and_update(
        {"_id": ctx["owner_id"]},
        {"$set": updates},
        return_document=True,
    )
    return OwnerResponse(
        owner_id=updated["_id"],
        name=updated["name"],
        phone=updated["phone_e164"],
        email=updated.get("email"),
        status=updated["status"],
        created_at=updated["created_at"],
    )