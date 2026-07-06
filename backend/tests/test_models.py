from datetime import date

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models import CatalogItem, Charge, Client, Payment, Property
from app.models.enums import ChargeKind, ItemKind, PaymentMethod, PropertyType
from app.services.numbering import fiscal_year, next_receipt_seq


def make_property(session) -> Property:
    client = Client(name="Test Client")
    session.add(client)
    session.flush()
    prop = Property(client_id=client.id, label="Flat", property_type=PropertyType.APARTMENT)
    session.add(prop)
    session.flush()
    return prop


def test_money_is_stored_as_whole_rupees(session):
    prop = make_property(session)
    session.add(Charge(property_id=prop.id, description="Toilet Blocker", quantity=3,
                       unit_price=1500, charge_date=date(2026, 7, 1)))
    session.commit()
    assert session.execute(text("SELECT unit_price FROM charges")).scalar() == 1500
    assert session.query(Charge).one().amount == 4500


def test_new_charge_defaults_work_before_saving():
    charge = Charge(description="Consultation", unit_price=500, charge_date=date(2026, 7, 1))
    assert (charge.quantity, charge.kind, charge.amount) == (1, ChargeKind.CHARGE, 500)


def test_discount_reduces_balance():
    discount = Charge(kind=ChargeKind.DISCOUNT, description="BNI Member Discount",
                      unit_price=1000, charge_date=date(2026, 7, 1))
    assert discount.signed_amount == -1000


@pytest.mark.parametrize("kind, size, allowed", [
    (ItemKind.REMEDY, 5, True),
    (ItemKind.REMEDY, 15, True),
    (ItemKind.REMEDY, 10, False),
    (ItemKind.REMEDY, None, False),
    (ItemKind.SERVICE, None, True),
    (ItemKind.SERVICE, 5, False),
])
def test_bottle_size_rules(session, kind, size, allowed):
    session.add(CatalogItem(kind=kind, name="Item", size_ml=size, unit_price=1500))
    if allowed:
        session.commit()
    else:
        with pytest.raises(IntegrityError):
            session.commit()


def test_foreign_keys_are_enforced(session):
    session.add(Charge(property_id="missing", description="x", unit_price=1,
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
        session.add(Payment(property_id=prop.id, amount=100, method=PaymentMethod.UPI,
                            paid_on=date(2026, 7, 1), fiscal_year=fy, receipt_seq=seq))
        session.flush()
    payment = session.query(Payment).filter_by(fiscal_year="2027-28").one()
    assert payment.receipt_no == "R/2027-28/0001"
