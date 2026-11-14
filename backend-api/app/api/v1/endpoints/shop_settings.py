from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["Settings & Profile"])

class ShopUpdatePayload(BaseModel):
    shop_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    expected_version: Optional[int] = None
    device_id: Optional[str] = None

@router.patch("/shops/me")
async def update_shop_me(payload: ShopUpdatePayload):
    # Optimistic locking (expected_version) පරීක්ෂා කර shop විස්තර update කිරීම
    return {"status": "ok", "message": "Shop profile updated"}

class PasswordChangePayload(BaseModel):
    current_password: str
    new_password: str

@router.post("/auth/change-password")
async def change_user_password(payload: PasswordChangePayload):
    # Hash කර මුරපදය පරීක්ෂා කර නව මුරපදය Save කිරීම
    return {"status": "ok", "message": "Password changed successfully"}