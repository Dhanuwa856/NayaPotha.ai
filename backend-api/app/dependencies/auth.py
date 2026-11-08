from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.mongo import get_db
from app.core.security import decode_access_token
from app.core.errors import AppError
from app.repositories.auth_repository import AuthRepository

security_scheme = HTTPBearer()

async def get_auth_repo(db=Depends(get_db)) -> AuthRepository:
    return AuthRepository(db)

async def get_current_context(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    repo: AuthRepository = Depends(get_auth_repo),
) -> dict:
    payload = decode_access_token(credentials.credentials)
    owner_id = payload.get("sub")
    shop_id = payload.get("shop_id")
    session_id = payload.get("session_id")

    session = await repo.get_session_by_id(session_id)
    if not session or session.get("status") != "ACTIVE":
        raise AppError("SESSION_REVOKED", "Device session is no longer active.", 401)

    owner = await repo.get_owner_by_id(owner_id)
    if not owner or owner.get("status") != "ACTIVE":
        raise AppError("ACCOUNT_INACTIVE", "Owner account is inactive.", 403)

    shop = await repo.get_shop_by_owner(owner_id)
    return {
        "owner": owner,
        "shop": shop,
        "session": session,
        "shop_id": shop_id,
        "owner_id": owner_id,
        "session_id": session_id,
    }