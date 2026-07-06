from datetime import date, datetime, timezone

import pytest

from app.models import Charge, Payment, Property, Visit
from app.models.enums import ChargeKind, PaymentMethod, VisitStatus
from app.services.ledger import PropertyStatus, most_urgent, summarize

TODAY = date(2026, 11, 27)


def charge(amount, kind=ChargeKind.CHARGE, voided=False):
    return Charge(description="x", unit_price=amount, kind=kind, charge_date=date(2026, 11, 1),
                  voided_at=datetime.now(timezone.utc) if voided else None)


def payment(amount, voided=False):
    return Payment(amount=amount, method=PaymentMethod.UPI, paid_on=date(2026, 11, 2),
                   voided_at=datetime.now(timezone.utc) if voided else None)


@pytest.mark.parametrize("charges, payments, visits, closed, status, balance", [
    ([], [], [], False, PropertyStatus.ENQUIRY, 0),
    ([charge(2000)], [], [], False, PropertyStatus.PAYMENT_DUE, 2000),
    ([charge(2000), charge(500, ChargeKind.DISCOUNT)], [payment(1500)], [], False, PropertyStatus.CLOSED, 0),
    ([charge(2000)], [payment(2000)], [Visit(visit_date=date(2026, 12, 1), status=VisitStatus.SCHEDULED)],
     False, PropertyStatus.IN_PROGRESS, 0),
    ([charge(2000)], [payment(2000), payment(9000, voided=True)], [], False, PropertyStatus.CLOSED, 0),
    ([charge(2000), charge(700, voided=True)], [], [], True, PropertyStatus.CLOSED, 2000),
    ([charge(1000)], [payment(3000)], [], False, PropertyStatus.CLOSED, -2000),
])
def test_summarize(charges, payments, visits, closed, status, balance):
    prop = Property(label="x", closed_at=datetime.now(timezone.utc) if closed else None)
    summary = summarize(prop, charges, payments, visits, TODAY)
    assert (summary.status, summary.balance) == (status, balance)


def test_most_urgent():
    assert most_urgent([PropertyStatus.CLOSED, PropertyStatus.PAYMENT_DUE]) == PropertyStatus.PAYMENT_DUE
    assert most_urgent([]) is None
