from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class UpdateOwnerRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None

class UpdateShopRequest(BaseModel):
    shop_name: Optional[str] = Field(None, min_length=2, max_length=120)
    address: Optional[str] = Field(None, max_length=255)
    language: Optional[str] = Field(None, pattern="^(si|en)$")

class ShopDetailResponse(BaseModel):
    shop_id: str
    owner_id: str
    shop_name: str
    address: Optional[str] = None
    currency: str
    timezone: str
    language: str = "si"
    created_at: datetime
    updated_at: datetime