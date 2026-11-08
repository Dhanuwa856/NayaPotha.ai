import uuid
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError
from app.core.config import settings
from app.core.errors import AppError
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_token,
)
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    AuthTokensResponse,
    OwnerResponse,
    ShopResponse,
)

class AuthService:
    def __init__(self, repo: AuthRepository):
        self.repo = repo

    async def register_owner(self, data: RegisterRequest) -> AuthTokensResponse:
        existing = await self.repo.get_owner_by_phone(data.phone)
        if existing:
            raise AppError(
                code="PHONE_ALREADY_REGISTERED",
                message="An account with this phone number already exists.",
                status_code=409,
            )

        now = datetime.now(timezone.utc)
        owner_id = str(uuid.uuid4())
        shop_id = str(uuid.uuid4())
        session_id = str(uuid.uuid4())

        owner_doc = {
            "_id": owner_id,
            "name": data.name,
            "phone_e164": data.phone,
            "email": data.email,
            "password_hash": hash_password(data.password),
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
        }

        shop_doc = {
            "_id": shop_id,
            "owner_id": owner_id,
            "shop_name": data.shop_name,
            "address": data.address,
            "currency": "LKR",
            "timezone": "Asia/Colombo",
            "language": "si",
            "created_at": now,
            "updated_at": now,
        }

        raw_refresh = generate_refresh_token()
        session_doc = {
            "_id": session_id,
            "owner_id": owner_id,
            "shop_id": shop_id,
            "device_id": data.device_id,
            "device_name": data.device_name,
            "refresh_token_hash": hash_token(raw_refresh),
            "status": "ACTIVE",
            "last_seen_at": now,
            "created_at": now,
            "revoked_at": None,
        }

        try:
            await self.repo.create_owner(owner_doc)
            await self.repo.create_shop(shop_doc)
            await self.repo.create_session(session_doc)
        except DuplicateKeyError:
            raise AppError(
                code="DUPLICATE_ACCOUNT",
                message="Phone or email is already registered.",
                status_code=409,
            )

        access_token = create_access_token(owner_id, shop_id, session_id, data.device_id)
        return self._build_auth_response(access_token, raw_refresh, owner_doc, shop_doc)

    async def login_owner(self, data: LoginRequest) -> AuthTokensResponse:
        owner = await self.repo.get_owner_by_phone(data.phone)
        if not owner or not verify_password(data.password, owner["password_hash"]):
            raise AppError(
                code="INVALID_CREDENTIALS",
                message="Invalid phone number or password.",
                status_code=401,
            )

        if owner.get("status") != "ACTIVE":
            raise AppError("ACCOUNT_INACTIVE", "Owner account is not active.", 403)

        shop = await self.repo.get_shop_by_owner(owner["_id"])
        if not shop:
            raise AppError("SHOP_NOT_FOUND", "Associated shop record not found.", 404)

        now = datetime.now(timezone.utc)
        active_session = await self.repo.get_active_session_for_shop(shop["_id"])

        # Enforce 1-Active-Device-Per-Shop Rule (Section 3.2)
        if active_session:
            if active_session["device_id"] != data.device_id:
                raise AppError(
                    code="ACTIVE_DEVICE_EXISTS",
                    message="Another device is currently active for this shop. Explicit device replacement is required.",
                    status_code=409,
                    details={"active_device_name": active_session.get("device_name")},
                )
            # Same device logging in again -> rotate refresh token on existing session
            raw_refresh = generate_refresh_token()
            await self.repo.update_session_token(active_session["_id"], hash_token(raw_refresh), now)
            session_id = active_session["_id"]
        else:
            session_id = str(uuid.uuid4())
            raw_refresh = generate_refresh_token()
            session_doc = {
                "_id": session_id,
                "owner_id": owner["_id"],
                "shop_id": shop["_id"],
                "device_id": data.device_id,
                "device_name": data.device_name,
                "refresh_token_hash": hash_token(raw_refresh),
                "status": "ACTIVE",
                "last_seen_at": now,
                "created_at": now,
                "revoked_at": None,
            }
            await self.repo.create_session(session_doc)

        access_token = create_access_token(owner["_id"], shop["_id"], session_id, data.device_id)
        return self._build_auth_response(access_token, raw_refresh, owner, shop)

    async def refresh_session(self, data: RefreshTokenRequest) -> dict:
        incoming_hash = hash_token(data.refresh_token)
        session = await self.repo.sessions.find_one({
            "refresh_token_hash": incoming_hash,
            "device_id": data.device_id,
            "status": "ACTIVE",
        })
        if not session:
            raise AppError("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.", 401)

        now = datetime.now(timezone.utc)
        new_raw_refresh = generate_refresh_token()
        await self.repo.update_session_token(session["_id"], hash_token(new_raw_refresh), now)

        new_access = create_access_token(
            session["owner_id"], session["shop_id"], session["_id"], session["device_id"]
        )
        return {
            "access_token": new_access,
            "refresh_token": new_raw_refresh,
            "token_type": "Bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_MINUTES * 60,
        }

    async def logout(self, session_id: str):
        now = datetime.now(timezone.utc)
        await self.repo.revoke_session(session_id, now)

    def _build_auth_response(self, access_token: str, refresh_token: str, owner: dict, shop: dict) -> AuthTokensResponse:
        return AuthTokensResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_ACCESS_TOKEN_MINUTES * 60,
            owner=OwnerResponse(
                owner_id=owner["_id"],
                name=owner["name"],
                phone=owner["phone_e164"],
                email=owner.get("email"),
                status=owner["status"],
                created_at=owner["created_at"],
            ),
            shop=ShopResponse(
                shop_id=shop["_id"],
                owner_id=shop["owner_id"],
                shop_name=shop["shop_name"],
                address=shop.get("address"),
                currency=shop["currency"],
                timezone=shop["timezone"],
            ),
        )