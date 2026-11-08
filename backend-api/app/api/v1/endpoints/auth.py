from fastapi import APIRouter, Depends, status
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    AuthTokensResponse,
)
from app.repositories.auth_repository import AuthRepository
from app.services.auth_service import AuthService
from app.dependencies.auth import get_auth_repo, get_current_context

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_auth_service(repo: AuthRepository = Depends(get_auth_repo)) -> AuthService:
    return AuthService(repo)

@router.post("/register", response_model=AuthTokensResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, service: AuthService = Depends(get_auth_service)):
    return await service.register_owner(payload)

@router.post("/login", response_model=AuthTokensResponse)
async def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)):
    return await service.login_owner(payload)

@router.post("/refresh")
async def refresh_token(payload: RefreshTokenRequest, service: AuthService = Depends(get_auth_service)):
    return await service.refresh_session(payload)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    ctx: dict = Depends(get_current_context),
    service: AuthService = Depends(get_auth_service),
):
    await service.logout(ctx["session_id"])
    return None

@router.get("/me")
async def get_me(ctx: dict = Depends(get_current_context)):
    owner = ctx["owner"]
    shop = ctx["shop"]
    return {
        "owner": {
            "owner_id": owner["_id"],
            "name": owner["name"],
            "phone": owner["phone_e164"],
            "email": owner.get("email"),
            "status": owner["status"],
        },
        "shop": {
            "shop_id": shop["_id"],
            "shop_name": shop["shop_name"],
            "address": shop.get("address"),
            "currency": shop["currency"],
            "timezone": shop["timezone"],
        },
        "device_session": {
            "session_id": ctx["session"]["_id"],
            "device_id": ctx["session"]["device_id"],
            "device_name": ctx["session"]["device_name"],
        },
    }