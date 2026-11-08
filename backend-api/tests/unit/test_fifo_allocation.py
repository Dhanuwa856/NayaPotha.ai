import pytest
from app.services.ledger_service import allocate_fifo_pure
from app.core.errors import AppError

def test_fifo_partial_allocation_across_multiple_credits():
    eligible_credits = [
        {"credit_entry_id": "cred-1", "remaining_minor": 10000}, # Rs. 100.00 (Oldest)
        {"credit_entry_id": "cred-2", "remaining_minor": 25000}, # Rs. 250.00 (Second)
    ]
    # Customer pays Rs. 150.00 (15000 cents)
    allocations = allocate_fifo_pure(15000, eligible_credits)

    assert allocations == [
        ("cred-1", 10000), # Oldest credit fully paid
        ("cred-2", 5000),  # Second credit partially paid (Rs. 50.00)
    ]

def test_fifo_rejects_overpayment():
    eligible_credits = [
        {"credit_entry_id": "cred-1", "remaining_minor": 10000},
    ]
    with pytest.raises(AppError) as exc_info:
        allocate_fifo_pure(12000, eligible_credits)

    assert exc_info.value.code == "PAYMENT_EXCEEDS_BALANCE"
    assert exc_info.value.status_code == 422