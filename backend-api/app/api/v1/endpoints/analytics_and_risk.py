from datetime import datetime
from typing import Optional, Any
from fastapi import APIRouter, Depends, Query, HTTPException

from app.db.mongo import get_db
from app.dependencies.auth import get_current_context

router = APIRouter(tags=["Dashboard, Reports & Risk"])

def _get_shop_id(ctx: Any) -> Optional[str]:
    if isinstance(ctx, dict):
        return ctx.get("shop_id") or (ctx.get("shop") or {}).get("shop_id")
    shop_id = getattr(ctx, "shop_id", None)
    if not shop_id and hasattr(ctx, "shop") and ctx.shop:
        shop_id = getattr(ctx.shop, "shop_id", None) or (
            ctx.shop.get("shop_id") if isinstance(ctx.shop, dict) else None
        )
    return shop_id

def _to_iso_str(val: Any) -> str:
    if isinstance(val, datetime):
        return val.isoformat()
    return str(val or "")


@router.get("/reports/dashboard")
async def get_dashboard_metrics(
    ctx: Any = Depends(get_current_context),
    db: Any = Depends(get_db),
):
    shop_id = _get_shop_id(ctx)
    today_prefix = datetime.utcnow().strftime("%Y-%m-%d")

    customers = await db.customers.find(
        {"shop_id": shop_id, "status": "ACTIVE"}, {"_id": 0}
    ).to_list(length=None)

    total_customers = len(customers)
    overdue_customers_count = 0
    total_outstanding_minor = 0
    customer_map = {}

    for c in customers:
        cid = c.get("customer_id")
        if cid:
            customer_map[cid] = c
        bal = c.get("balance_summary") or {}
        total_outstanding_minor += bal.get("outstanding_balance_minor", 0)
        if bal.get("overdue_balance_minor", 0) > 0:
            overdue_customers_count += 1

    all_posted_entries = await db.ledger_entries.find(
        {"shop_id": shop_id, "status": "POSTED"}, {"_id": 0}
    ).to_list(length=None)

    credit_by_customer = {}
    payment_by_customer = {}
    today_sales_minor = 0
    today_payments_minor = 0
    for e in all_posted_entries:
        customer_id = e.get("customer_id")
        amount_minor = e.get("amount_minor", 0)
        if customer_id:
            if e.get("type") == "CREDIT_SALE":
                credit_by_customer[customer_id] = (
                    credit_by_customer.get(customer_id, 0) + amount_minor
                )
            elif e.get("type") == "PAYMENT":
                payment_by_customer[customer_id] = (
                    payment_by_customer.get(customer_id, 0) + amount_minor
                )

        occ_str = _to_iso_str(e.get("occurred_at"))
        if occ_str.startswith(today_prefix):
            if e.get("type") == "CREDIT_SALE":
                today_sales_minor += amount_minor
            elif e.get("type") == "PAYMENT":
                today_payments_minor += amount_minor

    total_outstanding_minor = sum(
        max(
            0,
            credit_by_customer.get(customer_id, 0)
            - payment_by_customer.get(customer_id, 0),
        )
        for customer_id in set(credit_by_customer) | set(payment_by_customer)
    )

    recent_raw = (
        await db.ledger_entries.find({"shop_id": shop_id}, {"_id": 0})
        .sort("occurred_at", -1)
        .limit(10)
        .to_list(length=10)
    )

    recent_transactions = []
    for e in recent_raw:
        cid = e.get("customer_id", "")
        cust = customer_map.get(cid, {})
        recent_transactions.append(
            {
                "entry_id": e.get("entry_id"),
                "customer_id": cid,
                "customer_name": cust.get("name", "Customer"),
                "customer_code": f"NP-{cid[:4].upper()}" if cid else "NP-001",
                "type": e.get("type"),
                "amount_minor": e.get("amount_minor", 0),
                "occurred_at": _to_iso_str(e.get("occurred_at")),
                "status": e.get("status", "POSTED"),
            }
        )

    return {
        "totalCustomers": total_customers,
        "overdueCustomersCount": overdue_customers_count,
        "todaySalesMinor": today_sales_minor,
        "todayPaymentsMinor": today_payments_minor,
        "totalOutstandingMinor": total_outstanding_minor,
        "recentTransactions": recent_transactions,
    }


@router.get("/reports/overview")
async def get_reports_overview(
    selected_day: Optional[str] = Query(None),
    ctx: Any = Depends(get_current_context),
    db: Any = Depends(get_db),
):
    shop_id = _get_shop_id(ctx)
    customers = await db.customers.find(
        {"shop_id": shop_id, "status": "ACTIVE"}, {"_id": 0}
    ).to_list(length=None)
    cust_map = {c["customer_id"]: c for c in customers if "customer_id" in c}

    total_outstanding = sum(
        (c.get("balance_summary") or {}).get("outstanding_balance_minor", 0)
        for c in customers
    )
    overdue_count = sum(
        1
        for c in customers
        if (c.get("balance_summary") or {}).get("overdue_balance_minor", 0) > 0
    )

    entries = (
        await db.ledger_entries.find(
            {"shop_id": shop_id, "status": "POSTED"}, {"_id": 0}
        )
        .sort("occurred_at", 1)
        .to_list(length=None)
    )

    period_credit = 0
    period_payments = 0
    daily_map: dict[str, dict[str, int]] = {}
    running_by_cust: dict[str, int] = {}
    enriched_entries = []

    for e in entries:
        cid = e.get("customer_id", "")
        running_by_cust.setdefault(cid, 0)
        amt = e.get("amount_minor", 0)
        occ_str = _to_iso_str(e.get("occurred_at"))

        if e.get("type") == "CREDIT_SALE":
            period_credit += amt
            running_by_cust[cid] += amt
        elif e.get("type") == "PAYMENT":
            period_payments += amt
            running_by_cust[cid] = max(0, running_by_cust[cid] - amt)

        day_key = occ_str[:10]
        if day_key:
            daily_map.setdefault(day_key, {"creditMinor": 0, "paymentMinor": 0})
            if e.get("type") == "CREDIT_SALE":
                daily_map[day_key]["creditMinor"] += amt
            elif e.get("type") == "PAYMENT":
                daily_map[day_key]["paymentMinor"] += amt

        c_doc = cust_map.get(cid, {})
        enriched_entries.append(
            {
                **e,
                "occurred_at": occ_str,
                "customer_name": c_doc.get("name", "Customer"),
                "customer_code": f"NP-{cid[:4].upper()}" if cid else "NP-001",
                "running_balance_minor": running_by_cust[cid],
            }
        )

    sorted_days = sorted(daily_map.keys())
    target_day = selected_day or (
        sorted_days[-1] if sorted_days else datetime.utcnow().strftime("%Y-%m-%d")
    )
    day_entries = [
        item
        for item in reversed(enriched_entries)
        if item["occurred_at"].startswith(target_day)
    ]

    return {
        "totalCustomers": len(customers),
        "totalOutstandingMinor": total_outstanding,
        "overdueCustomersCount": overdue_count,
        "periodCreditMinor": period_credit,
        "periodPaymentsMinor": period_payments,
        "dailyBreakdown": [{"date": d, **daily_map[d]} for d in sorted_days[-7:]],
        "targetDay": target_day,
        "availableDates": list(reversed(sorted_days)),
        "dayEntries": day_entries,
        "dayCreditMinor": sum(
            i["amount_minor"] for i in day_entries if i.get("type") == "CREDIT_SALE"
        ),
        "dayCreditCount": sum(
            1 for i in day_entries if i.get("type") == "CREDIT_SALE"
        ),
        "dayPaymentMinor": sum(
            i["amount_minor"] for i in day_entries if i.get("type") == "PAYMENT"
        ),
        "dayPaymentCount": sum(1 for i in day_entries if i.get("type") == "PAYMENT"),
    }


@router.get("/risk/customers/{customer_id}/latest")
async def evaluate_customer_risk(
    customer_id: str,
    ctx: Any = Depends(get_current_context),
    db: Any = Depends(get_db),
):
    shop_id = _get_shop_id(ctx)
    cust = await db.customers.find_one(
        {"customer_id": customer_id, "shop_id": shop_id}, {"_id": 0}
    )
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    entries = (
        await db.ledger_entries.find({"customer_id": customer_id, "shop_id": shop_id})
        .sort("occurred_at", 1)
        .to_list(length=None)
    )

    posted_entries = [
        e
        for e in entries
        if e.get("status") == "POSTED" and e.get("type") != "REVERSAL"
    ]
    reversed_count = sum(
        1
        for e in entries
        if e.get("status") == "REVERSED" or e.get("type") == "REVERSAL"
    )

    if len(posted_entries) < 2:
        return {
            "customer_id": customer_id,
            "category": "INSUFFICIENT_HISTORY",
            "overdue_days": 0,
            "overdue_balance_minor": 0,
            "recent_payment_minor": 0,
            "recent_payment_date": None,
            "limit_usage_percent": 0.0,
            "credit_limit_minor": cust.get("credit_limit_minor"),
            "reasons": [
                "Insufficient History: Fewer than 2 posted ledger entries exist for this customer."
            ],
        }

    now = datetime.utcnow()
    bal = cust.get("balance_summary") or {}
    out_minor = bal.get("outstanding_balance_minor", 0)
    overdue_minor = bal.get("overdue_balance_minor", 0)
    limit_minor = cust.get("credit_limit_minor")
    usage_pct = (
        (out_minor / limit_minor * 100.0)
        if (limit_minor and limit_minor > 0)
        else 0.0
    )

    max_overdue_days = 0
    for e in posted_entries:
        if (
            e.get("type") == "CREDIT_SALE"
            and (e.get("remaining_unpaid_minor") or 0) > 0
            and e.get("due_date")
        ):
            try:
                due_dt = datetime.fromisoformat(str(e["due_date"])[:10])
                if due_dt < now:
                    days = (now - due_dt).days
                    if days > max_overdue_days:
                        max_overdue_days = days
            except ValueError:
                pass

    payments = [e for e in posted_entries if e.get("type") == "PAYMENT"]
    latest_payment = payments[-1] if payments else None
    recent_pay_minor = latest_payment.get("amount_minor", 0) if latest_payment else 0
    recent_pay_date = (
        _to_iso_str(latest_payment.get("occurred_at")) if latest_payment else None
    )

    reasons = []
    if max_overdue_days > 14 or (overdue_minor > 0 and usage_pct >= 85):
        category = "HIGH"
        reasons.append(
            f"Overdue by {max_overdue_days} days with {usage_pct:.1f}% credit limit used."
        )
    elif max_overdue_days > 0 or usage_pct >= 60:
        category = "MEDIUM"
        reasons.append(
            f"Balance is {max_overdue_days} days past due, though recent payments of Rs.{recent_pay_minor/100:,.2f} were recorded."
        )
    else:
        category = "LOW"
        reasons.append(
            "All FIFO credit allocations are within due dates and limit usage is healthy."
        )

    if reversed_count > 0:
        reasons.append(
            f"{reversed_count} reversed entry(s) excluded from debt calculation."
        )

    return {
        "customer_id": customer_id,
        "category": category,
        "overdue_days": max_overdue_days,
        "overdue_balance_minor": overdue_minor,
        "recent_payment_minor": recent_pay_minor,
        "recent_payment_date": recent_pay_date,
        "limit_usage_percent": round(usage_pct, 1),
        "credit_limit_minor": limit_minor,
        "reasons": reasons,
    }