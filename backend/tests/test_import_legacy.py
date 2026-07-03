import sqlite3
from datetime import date
from decimal import Decimal

import pytest

from app.cli.import_legacy import (
    CatalogIndex, Report, import_all, infer_property_type, normalize, parse_line, to_date, verify,
)
from app.cli.seed import seed_catalog
from app.models import CatalogItem, Charge, Payment, Property
from app.models.enums import PropertyType

LEGACY_SCHEMA = """
CREATE TABLE users (id TEXT, email TEXT, hashed_password TEXT, is_active BOOLEAN, created_at TEXT);
CREATE TABLE clients (id TEXT, full_name TEXT, phone TEXT, email TEXT, personal_address TEXT,
    project_address TEXT, built_up_area REAL, location_type TEXT, lead_status TEXT, service_id TEXT,
    total_fees_fixed NUMERIC, created_at TEXT, updated_at TEXT);
CREATE TABLE visits (id TEXT, client_id TEXT, date TEXT, purpose TEXT, observations TEXT,
    amount NUMERIC, created_at TEXT);
CREATE TABLE service_entries (id TEXT, client_id TEXT, visit_id TEXT, description TEXT, amount NUMERIC,
    entry_type TEXT, date TEXT, created_at TEXT);
CREATE TABLE payments (id TEXT, client_id TEXT, amount NUMERIC, method TEXT, date TEXT, notes TEXT,
    created_at TEXT);
"""


@pytest.fixture
def legacy(tmp_path):
    path = tmp_path / "legacy.db"
    conn = sqlite3.connect(path)
    conn.executescript(LEGACY_SCHEMA)
    conn.execute("INSERT INTO users VALUES ('u1', 'a@example.com', 'hash', 1, '2026-01-01 10:00:00')")
    conn.execute("INSERT INTO clients VALUES ('c1', ' Asha ', '', '', '', 'Flat 4, Panjim', NULL, 'Goa', "
                 "'Completed', NULL, 2000, '2026-03-01 00:00:00', NULL)")
    conn.execute("INSERT INTO clients VALUES ('c2', 'Ravi', NULL, NULL, NULL, NULL, NULL, 'Karnataka', "
                 "'Active', 'svc', 0, '2026-04-02 20:00:00', NULL)")
    conn.execute("INSERT INTO visits VALUES ('v1', 'c1', '2026-03-02 00:00:00', 'Remedies Installation', "
                 "'Shop next door', 1000, '2026-03-02 00:00:00')")
    rows = [
        ("s1", "c1", None, "Toilet Blocker - Remedy 5ml x2", 3000, "charge", "2026-03-02 00:00:00"),
        ("s2", "c1", None, "Devta Enhancers - Remedy x7", 7000, "charge", "2026-03-02 00:00:00"),
        ("s3", "c1", "v1", "Visit Charge: Remedies Installation", 1000, "charge", "2026-03-02 00:00:00"),
        ("s4", "c1", None, "BNI Member Discount", 1000, "discount", "2026-03-02 00:00:00"),
        ("s5", "c2", None, "Post-Construction Bundle", 8800, "charge", "2026-04-03 00:00:00"),
    ]
    conn.executemany("INSERT INTO service_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                     [r + (r[6],) for r in rows])
    conn.executemany("INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?, ?)", [
        ("p1", "c1", 5000, "UPI / GPay", "2026-03-31 00:00:00", None, "2026-03-31 00:00:00"),
        ("p2", "c1", 7000, "Cash", "2026-04-01 00:00:00", "balance", "2026-04-01 00:00:00"),
        ("p3", "c2", 8800, "Bank Transfer", "2026-04-05 00:00:00", None, "2026-04-05 00:00:00"),
    ])
    conn.commit()
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


def run_import(legacy, session):
    seed_catalog(session)
    report = Report()
    property_of = import_all(legacy, session, report)
    verify(legacy, session, property_of, report)
    return report, property_of


def test_import_keeps_every_balance(legacy, session):
    report, property_of = run_import(legacy, session)
    assert report.mismatches == []
    assert report.counts["total billed"] == Decimal("20800.00")
    assert report.counts["total paid"] == Decimal("20800.00")


def test_import_structures_free_text_charges(legacy, session):
    run_import(legacy, session)
    toilet = session.query(Charge).filter_by(id="s1").one()
    assert (toilet.quantity, toilet.unit_price) == (2, Decimal("1500.00"))
    assert session.get(CatalogItem, toilet.catalog_item_id).name == "Toilet Blocker"

    devta = session.query(Charge).filter_by(id="s2").one()
    assert (devta.quantity, devta.unit_price) == (7, Decimal("1000.00"))
    assert session.get(CatalogItem, devta.catalog_item_id).name == "Devata Enhancer"

    bundle = session.query(Charge).filter_by(id="s5").one()
    assert bundle.catalog_item_id is None and bundle.description == "Post-Construction Bundle"

    fee = session.query(Charge).filter_by(description="Initial consultation fee").one()
    assert fee.charge_date == date(2026, 3, 1)


def test_import_numbers_receipts_per_fiscal_year(legacy, session):
    run_import(legacy, session)
    numbers = {p.id: p.receipt_no for p in session.query(Payment)}
    assert numbers == {"p1": "R/2025-26/0001", "p2": "R/2026-27/0001", "p3": "R/2026-27/0002"}


def test_import_creates_one_property_per_client(legacy, session):
    _, property_of = run_import(legacy, session)
    asha = session.get(Property, property_of["c1"])
    assert (asha.label, asha.property_type) == ("Flat 4", PropertyType.SHOP)
    ravi = session.get(Property, property_of["c2"])
    assert ravi.notes == "Location: Karnataka"


def test_import_reports_balance_mismatch(legacy, session):
    report, property_of = run_import(legacy, session)
    session.query(Payment).filter_by(id="p3").one().amount = Decimal("8000")
    session.flush()
    report = Report()
    verify(legacy, session, property_of, report)
    assert len(report.mismatches) == 1 and "Ravi" in report.mismatches[0]


@pytest.mark.parametrize("raw, expected", [
    ("(Shutter) Door Blocker - Remedy 15ml x2", "shutter door blocker"),
    ("Main Door - Placement x1", "main door placement"),
    ("Toilet Placements - 3 x2 Floors", "toilet placement"),
    ("Washing Machine +ve Oil - Remedy x1", "washing machine positive oil"),
    ("Virtual Door Open Remedy x2", "virtual door opener"),
])
def test_normalize(raw, expected):
    assert normalize(raw) == expected


def test_parse_line_keeps_quantity_one_when_amount_does_not_divide():
    catalog = CatalogIndex([])
    parsed = parse_line("Something x3", Decimal("1000"), catalog)
    assert (parsed.quantity, parsed.unit_price) == (1, Decimal("1000.00"))


def test_to_date_converts_server_timestamps_to_ist():
    assert to_date("2026-03-01 00:00:00.000000") == date(2026, 3, 1)
    assert to_date("2026-03-01 20:00:00") == date(2026, 3, 2)


def test_infer_property_type_defaults_to_other():
    assert infer_property_type(None, "Site Inspection") == PropertyType.OTHER
    assert infer_property_type("Plot no 5") == PropertyType.PLOT
