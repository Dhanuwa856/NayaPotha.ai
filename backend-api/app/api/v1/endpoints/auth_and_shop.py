import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from passlib.context import CryptContext

from app.db.mongo import get_db
from app.dependencies.auth import get_current_context

router = APIRouter(tags=["Auth & Shop Profile"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _extract_ids(ctx: Any) -> tuple[Optional[str], Optional[str]]:
    """Extracts (owner_id, shop_id) safely whether ctx is a Pydantic model, object, or dict."""
    if isinstance(ctx, dict):
        owner_id = (
            ctx.get("owner_id")
            or ctx.get("user_id")
            or (ctx.get("owner") or {}).get("owner_id")
        )
        shop_id = ctx.get("shop_id") or (ctx.get("shop") or {}).get("shop_id")
        return owner_id, shop_id

    owner_id = getattr(ctx, "owner_id", None) or getattr(ctx, "user_id", None)
    if not owner_id and hasattr(ctx, "owner") and ctx.owner:
        owner_id = getattr(ctx.owner, "owner_id", None) or (
            ctx.owner.get("owner_id") if isinstance(ctx.owner, dict) else None
        )

    shop_id = getattr(ctx, "shop_id", None)
    if not shop_id and hasattr(ctx, "shop") and ctx.shop:
        shop_id = getattr(ctx.shop, "shop_id", None) or (
            ctx.shop.get("shop_id") if isinstance(ctx.shop, dict) else None
        )

    return owner_id, shop_id


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class ForgotPasswordRequest(BaseModel):
    identifier: str


class ResetPasswordRequest(BaseModel):
    identifier: str
    reset_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)


class ShopUpdateRequest(BaseModel):
    shop_name: Optional[str] = Field(None, min_length=1, max_length=120)
    phone_number: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=250)
    expected_version: Optional[int] = None
    device_id: Optional[str] = None


@router.post("/auth/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    ctx: Any = Depends(get_current_context),
    db: Any = Depends(get_db),
):
    owner_id, _ = _extract_ids(ctx)
    owner_doc = await db.owners.find_one({"owner_id": owner_id})
    if not owner_doc:
        raise HTTPException(status_code=404, detail="Owner account not found.")

    stored_hash = owner_doc.get("password_hash") or owner_doc.get("hashed_password")
    if not stored_hash or not pwd_context.verify(payload.current_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    new_hash = pwd_context.hash(payload.new_password)
    hash_field = "hashed_password" if "hashed_password" in owner_doc else "password_hash"

    await db.owners.update_one(
        {"owner_id": owner_id},
        {
            "$set": {
                hash_field: new_hash,
                "updated_at": datetime.utcnow().isoformat(),
            }
        },
    )
    return {"status": "success", "message": "Password updated in database."}


@router.post("/auth/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Any = Depends(get_db),
):
    ident = payload.identifier.strip()
    owner = await db.owners.find_one(
        {"$or": [{"phone_number": ident}, {"email": ident.lower()}, {"phone": ident}]}
    )
    if not owner:
        raise HTTPException(status_code=404, detail="No account found with this phone/email.")

    reset_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat()

    await db.password_resets.update_one(
        {"owner_id": owner["owner_id"]},
        {
            "$set": {
                "owner_id": owner["owner_id"],
                "identifier": ident,
                "reset_code": reset_code,
                "expires_at": expires_at,
                "used": False,
            }
        },
        upsert=True,
    )
    return {
        "status": "sent",
        "message": "6-digit recovery code generated.",
        "dev_reset_code": reset_code if os.getenv("ENV", "dev") == "dev" else None,
    }


@router.post("/auth/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: Any = Depends(get_db),
):
    ident = payload.identifier.strip()
    record = await db.password_resets.find_one(
        {"identifier": ident, "reset_code": payload.reset_code, "used": False}
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired recovery code.")

    if datetime.fromisoformat(record["expires_at"]) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Recovery code has expired.")

    owner_doc = await db.owners.find_one({"owner_id": record["owner_id"]})
    hash_field = (
        "hashed_password"
        if (owner_doc and "hashed_password" in owner_doc)
        else "password_hash"
    )
    new_hash = pwd_context.hash(payload.new_password)

    await db.owners.update_one(
        {"owner_id": record["owner_id"]},
        {"$set": {hash_field: new_hash, "updated_at": datetime.utcnow().isoformat()}},
    )
    await db.password_resets.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
    return {"status": "success", "message": "Password has been reset."}


@router.patch("/shops/me")
async def update_shop_profile(
    payload: ShopUpdateRequest,
    ctx: Any = Depends(get_current_context),
    db: Any = Depends(get_db),
):
    _, shop_id = _extract_ids(ctx)
    shop = await db.shops.find_one({"shop_id": shop_id})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found.")

    current_version = shop.get("entity_version", 1)
    if payload.expected_version is not None and payload.expected_version != current_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "VERSION_CONFLICT",
                "message": "Shop profile was modified on another device.",
                "server_version": current_version,
            },
        )

    update_fields: dict[str, Any] = {
        "updated_at": datetime.utcnow().isoformat(),
        "entity_version": current_version + 1,
    }
    if payload.shop_name is not None:
        update_fields["shop_name"] = payload.shop_name.strip()
    if payload.phone_number is not None:
        update_fields["phone_number"] = payload.phone_number.strip() or None
    if payload.address is not None:
        update_fields["address"] = payload.address.strip() or None

    await db.shops.update_one({"shop_id": shop_id}, {"$set": update_fields})
    updated_shop = await db.shops.find_one({"shop_id": shop_id}, {"_id": 0})
    return updated_shop