from fastapi import APIRouter
from app.db.mongo import get_db
from app.core.errors import AppError

router = APIRouter(tags=["Health"])

@router.get("/health/live")
async def health_live():
    return {"status": "alive"}

@router.get("/health/ready")
async def health_ready():
    try:
        db = get_db()
        await db.command("ping")
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise AppError(
            code="DATABASE_UNAVAILABLE",
            message="Database connectivity check failed.",
            status_code=503,
            details={"reason": str(e)},
        )