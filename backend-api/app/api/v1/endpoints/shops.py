from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.db.mongo import get_db
from app.dependencies.auth import get_current_context
from app.schemas.shop import UpdateShopRequest, ShopDetailResponse

router = APIRouter(prefix="/shops", tags=["Owner & Shop"])

@router.get("/me", response_model=ShopDetailResponse)
async def get_my_shop(ctx: dict = Depends(get_current_context)):
    shop = ctx["shop"]
    return ShopDetailResponse(
        shop_id=shop["_id"],
        owner_id=shop["owner_id"],
        shop_name=shop["shop_name"],
        address=shop.get("address"),
        currency=shop["currency"],
        timezone=shop["timezone"],
        language=shop.get("language", "si"),
        created_at=shop["created_at"],
        updated_at=shop["updated_at"],
    )

@router.patch("/me", response_model=ShopDetailResponse)
async def update_my_shop(
    payload: UpdateShopRequest,
    ctx: dict = Depends(get_current_context),
    db=Depends(get_db),
):
    updates = {"updated_at": datetime.now(timezone.utc)}
    if payload.shop_name is not None:
        updates["shop_name"] = payload.shop_name.strip()
    if payload.address is not None:
        updates["address"] = payload.address.strip() or None
    if payload.language is not None:
        updates["language"] = payload.language

    updated = await db.shops.find_one_and_update(
        {"_id": ctx["shop_id"]},
        {"$set": updates},
        return_document=True,
    )
    return ShopDetailResponse(
        shop_id=updated["_id"],
        owner_id=updated["owner_id"],
        shop_name=updated["shop_name"],
        address=updated.get("address"),
        currency=updated["currency"],
        timezone=updated["timezone"],
        language=updated.get("language", "si"),
        created_at=updated["created_at"],
        updated_at=updated["updated_at"],
    )