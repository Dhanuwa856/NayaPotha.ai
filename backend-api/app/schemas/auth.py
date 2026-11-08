import re
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
from datetime import datetime

def normalize_sl_phone(phone: str) -> str:
    cleaned = re.sub(r"[\s\-()]", "", phone)
    if cleaned.startswith("0") and len(cleaned) == 10:
        cleaned = "+94" + cleaned[1:]
    elif cleaned.startswith("94") and len(cleaned) == 11:
        cleaned = "+" + cleaned
    if not re.match(r"^\+94\d{9}$", cleaned):
        raise ValueError("Phone number must be a valid Sri Lankan number (e.g., +94771234567 or 0771234567)")
    return cleaned

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=8, max_length=256)
    shop_name: str = Field(..., min_length=2, max_length=120)
    address: Optional[str] = Field(None, max_length=255)
    device_id: str = Field(..., min_length=4, max_length=128)
    device_name: str = Field(..., min_length=2, max_length=120)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_sl_phone(v)

class LoginRequest(BaseModel):
    phone: str
    password: str
    device_id: str = Field(..., min_length=4, max_length=128)
    device_name: str = Field(..., min_length=2, max_length=120)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_sl_phone(v)

class RefreshTokenRequest(BaseModel):
    refresh_token: str
    device_id: str

class OwnerResponse(BaseModel):
    owner_id: str
    name: str
    phone: str
    email: Optional[str] = None
    status: str
    created_at: datetime

class ShopResponse(BaseModel):
    shop_id: str
    owner_id: str
    shop_name: str
    address: Optional[str] = None
    currency: str
    timezone: str

class AuthTokensResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    owner: OwnerResponse
    shop: ShopResponse