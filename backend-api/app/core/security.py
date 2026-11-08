import bcrypt
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from jose import jwt, JWTError
from app.core.config import settings
from app.core.errors import AppError

ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    """Password එක bytes බවට හරවා bcrypt මගින් hash කිරීම."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """ලබාදුන් password එක සහ database එකේ ඇති hash එක සැසඳීම."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

def hash_token(token: str) -> str:
    """Refresh token එක Database එකේ කෙලින්ම save නොකර SHA-256 hash එකක් ලෙස තබා ගැනීම."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_access_token(subject: str, shop_id: str, session_id: str, device_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES)
    to_encode: Dict[str, Any] = {
        "sub": subject,          # owner_id
        "shop_id": shop_id,
        "session_id": session_id,
        "device_id": device_id,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)

def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)

def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise AppError("INVALID_TOKEN", "Invalid token type.", 401)
        return payload
    except JWTError:
        raise AppError("UNAUTHORIZED", "Could not validate credentials or token expired.", 401)