# backend-api/tests/test_audit_integration.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_full_ledger_fifo_reversal_and_risk_lifecycle(async_client: AsyncClient, auth_headers: dict):
    # 1. Create a customer with a credit limit of Rs. 8,000 (800,000 minor)
    cust_res = await async_client.post(
        "/api/v1/customers",
        json={
            "name": "Nimal Perera",
            "nickname": "Groceries",
            "credit_limit_minor": 800000,
        },
        headers=auth_headers,
    )
    assert cust_res.status_code in (200, 201)
    customer_id = cust_res.json()["customer_id"]

    # 2. Record Credit Sale #1 (Rs. 5,000, overdue due_date)
    c1 = await async_client.post(
        "/api/v1/ledger/credit-sales",
        json={
            "operation_id": "test_op_cred_1",
            "customer_id": customer_id,
            "amount_minor": 500000,
            "note": "Rice & Sugar",
            "due_date": "2026-10-01",
            "device_id": "test_dev_01",
        },
        headers=auth_headers,
    )
    assert c1.status_code in (200, 201)
    entry_1_id = c1.json()["entry"]["entry_id"]

    # 3. Record Partial Payment (Rs. 2,000) -> FIFO reduces Credit #1 remaining_unpaid to Rs. 3,000
    p1 = await async_client.post(
        "/api/v1/ledger/payments",
        json={
            "operation_id": "test_op_pay_1",
            "customer_id": customer_id,
            "amount_minor": 200000,
            "note": "Cash partial",
            "device_id": "test_dev_01",
        },
        headers=auth_headers,
    )
    assert p1.status_code in (200, 201)
    assert p1.json()["balance_summary"]["outstanding_balance_minor"] == 300000

    # 4. Evaluate Risk -> Should reflect overdue status and 37.5% limit usage
    risk_res = await async_client.get(
        f"/api/v1/risk/customers/{customer_id}/latest", headers=auth_headers
    )
    assert risk_res.status_code == 200
    assert risk_res.json()["category"] in ("MEDIUM", "HIGH")
    assert risk_res.json()["recent_payment_minor"] == 200000

    # 5. Reverse Credit Sale #1 and verify audit trail retention
    rev_res = await async_client.post(
        f"/api/v1/ledger/entries/{entry_1_id}/reverse",
        json={
            "operation_id": "test_op_rev_1",
            "reason": "Entered under wrong customer",
            "device_id": "test_dev_01",
        },
        headers=auth_headers,
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["entry"]["type"] == "REVERSAL"

@pytest.mark.asyncio
async def test_shop_profile_version_conflict(async_client: AsyncClient, auth_headers: dict):
    # Sending an outdated expected_version must return 409 Conflict
    res = await async_client.patch(
        "/api/v1/shops/me",
        json={"shop_name": "Updated Store", "expected_version": 999},
        headers=auth_headers,
    )
    assert res.status_code == 409