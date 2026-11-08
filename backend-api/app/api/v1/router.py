from fastapi import APIRouter
from app.api.v1.endpoints import health,auth,owners,shops,customers

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(owners.router)
api_router.include_router(shops.router)
api_router.include_router(customers.router)