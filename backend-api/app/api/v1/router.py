from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, owners, shops, customers, ledger,sync, risk_voice, auth_and_shop, analytics_and_risk, voice

api_router = APIRouter()
api_router.include_router(auth_and_shop.router)
api_router.include_router(analytics_and_risk.router)
api_router.include_router(voice.router)

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(owners.router)
api_router.include_router(shops.router)
api_router.include_router(customers.router)
api_router.include_router(ledger.router)
api_router.include_router(sync.router)
api_router.include_router(risk_voice.router)

