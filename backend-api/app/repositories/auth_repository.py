from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

class AuthRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.owners = db.owner_accounts
        self.shops = db.shops
        self.sessions = db.device_sessions
        self.audits = db.audit_events

    async def get_owner_by_phone(self, phone_e164: str) -> Optional[Dict[str, Any]]:
        return await self.owners.find_one({"phone_e164": phone_e164})

    async def get_owner_by_id(self, owner_id: str) -> Optional[Dict[str, Any]]:
        return await self.owners.find_one({"_id": owner_id})

    async def create_owner(self, owner_doc: Dict[str, Any]):
        await self.owners.insert_one(owner_doc)

    async def create_shop(self, shop_doc: Dict[str, Any]):
        await self.shops.insert_one(shop_doc)

    async def get_shop_by_owner(self, owner_id: str) -> Optional[Dict[str, Any]]:
        return await self.shops.find_one({"owner_id": owner_id})

    async def get_active_session_for_shop(self, shop_id: str) -> Optional[Dict[str, Any]]:
        return await self.sessions.find_one({"shop_id": shop_id, "status": "ACTIVE"})

    async def get_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        return await self.sessions.find_one({"_id": session_id})

    async def create_session(self, session_doc: Dict[str, Any]):
        await self.sessions.insert_one(session_doc)

    async def update_session_token(self, session_id: str, new_refresh_hash: str, now):
        await self.sessions.update_one(
            {"_id": session_id},
            {"$set": {"refresh_token_hash": new_refresh_hash, "last_seen_at": now}}
        )

    async def revoke_session(self, session_id: str, now):
        await self.sessions.update_one(
            {"_id": session_id},
            {"$set": {"status": "REVOKED", "revoked_at": now}}
        )

    async def log_audit(self, audit_doc: Dict[str, Any]):
        await self.audits.insert_one(audit_doc)