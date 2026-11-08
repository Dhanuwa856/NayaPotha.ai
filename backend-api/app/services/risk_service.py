import uuid
from datetime import datetime, timezone
from app.core.errors import AppError
from app.schemas.risk_voice import RiskAssessmentResponse

class RiskService:
    def __init__(self, db):
        self.risk_col = db.risk_assessments
        self.customers = db.customers
        self.ledger = db.ledger_entries
        self.allocations = db.payment_allocations

    async def assess_customer_risk(self, shop_id: str, customer_id: str) -> RiskAssessmentResponse:
        customer = await self.customers.find_one({"_id": customer_id, "shop_id": shop_id})
        if not customer:
            raise AppError("CUSTOMER_NOT_FOUND", "Customer not found.", 404)

        # Gather ledger stats for rules
        cursor = self.ledger.find({"shop_id": shop_id, "customer_id": customer_id, "status": "POSTED"})
        entries = await cursor.to_list(length=None)

        total_credit = sum(e["amount_minor"] for e in entries if e["type"] == "CREDIT_SALE")
        total_paid = 0
        for e in entries:
            if e["type"] == "PAYMENT":
                total_paid += e["amount_minor"]

        outstanding = max(0, total_credit - total_paid)
        credit_limit = customer.get("credit_limit_minor")

        reasons = []
        score = 10.0
        category = "LOW"

        # Rule 1: Credit limit breach
        if credit_limit and outstanding > credit_limit:
            score += 50.0
            reasons.append(f"Outstanding balance (LKR {outstanding/100:.2f}) exceeds the assigned credit limit.")
            category = "HIGH"
        elif credit_limit and outstanding >= (credit_limit * 0.8):
            score += 25.0
            reasons.append("Outstanding balance is approaching the credit limit (>= 80%).")
            category = "MEDIUM"

        # Rule 2: High overall debt volume
        if outstanding > 5000000:  # > Rs. 50,000.00
            score += 20.0
            reasons.append("High overall cumulative credit exposure.")
            if category != "HIGH":
                category = "MEDIUM"

        if not reasons:
            reasons.append("Payment pattern is consistent. No overdue or limit violations detected.")

        now = datetime.now(timezone.utc)
        assessment_id = str(uuid.uuid4())
        doc = {
            "_id": assessment_id,
            "shop_id": shop_id,
            "customer_id": customer_id,
            "category": category,
            "score": min(score, 100.0),
            "reasons": reasons,
            "rule_version": "v1.0-rules",
            "input_snapshot": {"outstanding_minor": outstanding, "credit_limit_minor": credit_limit},
            "assessed_at": now,
        }

        await self.risk_col.insert_one(doc)
        return RiskAssessmentResponse(
            assessment_id=assessment_id,
            shop_id=shop_id,
            customer_id=customer_id,
            category=category,
            score=min(score, 100.0),
            reasons=reasons,
            rule_version="v1.0-rules",
            assessed_at=now,
        )

    async def get_latest_risk(self, shop_id: str, customer_id: str) -> RiskAssessmentResponse:
        doc = await self.risk_col.find_one(
            {"shop_id": shop_id, "customer_id": customer_id},
            sort=[("assessed_at", -1)],
        )
        if not doc:
            return await self.assess_customer_risk(shop_id, customer_id)
        return RiskAssessmentResponse(
            assessment_id=doc["_id"],
            shop_id=doc["shop_id"],
            customer_id=doc["customer_id"],
            category=doc["category"],
            score=doc.get("score"),
            reasons=doc["reasons"],
            rule_version=doc["rule_version"],
            assessed_at=doc["assessed_at"],
        )