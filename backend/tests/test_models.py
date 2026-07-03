from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models import Charge, Client, Payment, Property
from app.models.enums import ChargeKind, PaymentMethod, PropertyType
from app.services.numbering import fiscal_year, next_receipt_seq


def make_property(session) -> Property:
    client = Client(name="Test Client")
    session.add(client)
    session.flush()
    prop = Property(client_id=client.id, label="Flat", property_type=PropertyType.APARTMENT)
    session.add(prop)
    session.flush()
    return prop


def test_money_is_stored_as_exact_paise(session):
    prop = make_property(session)
    session.add(Charge(property_id=prop.id, description="Toilet Blocker", quantity=3,
                       unit_price=Decimal("1500.10"), charge_date=date(2026, 7, 1)))
    session.commit()
    assert session.execute(text("SELECT unit_price FROM charges")).scalar() == 150010
    charge = session.query(Charge).one()
    assert charge.amount == Decimal("4500.30")


def test_discount_reduces_balance(session):
    prop = make_property(session)
    discount = Charge(property_id=prop.id, kind=ChargeKind.DISCOUNT, description="BNI Member Discount", quantity=1,
                      unit_price=Decimal("1000"), charge_date=date(2026, 7, 1))
    assert discount.signed_amount == Decimal("-1000")


def test_foreign_keys_are_enforced(session):
    session.add(Charge(property_id="missing", description="x", unit_price=Decimal("1"),
                       charge_date=date(2026, 7, 1)))
    with pytest.raises(IntegrityError):
        session.commit()


def test_client_with_properties_cannot_be_deleted(session):
    prop = make_property(session)
    session.commit()
    with pytest.raises(IntegrityError):
        session.execute(text("DELETE FROM clients WHERE id = :id"), {"id": prop.client_id})


@pytest.mark.parametrize("day, expected", [
    (date(2026, 3, 31), "2025-26"),
    (date(2026, 4, 1), "2026-27"),
    (date(2027, 1, 15), "2026-27"),
    (date(2099, 12, 1), "2099-00"),
])
def test_fiscal_year(day, expected):
    assert fiscal_year(day) == expected


def test_receipt_numbers_restart_each_fiscal_year(session):
    prop = make_property(session)
    for fy, seq in (("2026-27", 1), ("2026-27", 2), ("2027-28", 1)):
        assert next_receipt_seq(session, fy) == seq
        session.add(Payment(property_id=prop.id, amount=Decimal("100"), method=PaymentMethod.UPI,
                            paid_on=date(2026, 7, 1), fiscal_year=fy, receipt_seq=seq))
        session.flush()
    payment = session.query(Payment).filter_by(fiscal_year="2027-28").one()
    assert payment.receipt_no == "R/2027-28/0001"
