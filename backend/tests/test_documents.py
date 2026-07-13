"""Receipts, numbered bills, quotes and the consultation report."""
from datetime import date
from types import SimpleNamespace

import pytest

from app.documents.render import Business, indian_number, render_html, upi_link
from app.documents.words import rupees_in_words
from tests.test_api_flow import catalog_item, new_client


async def billed_property(api) -> str:
    pid = (await new_client(api))["properties"][0]["id"]
    door = await catalog_item(api, "Door Blocker", 15)
    inspection = await catalog_item(api, "Site Inspection")
    response = await api.post(f"/api/v1/properties/{pid}/charges", json={
        "charge_date": "2026-11-20", "lines": [
            {"catalog_item_id": inspection["id"]},
            {"catalog_item_id": door["id"], "quantity": 2, "note": "Shutter"},
        ]})
    assert response.status_code == 201
    return pid


def is_pdf(response) -> bool:
    return (response.status_code == 200 and response.headers["content-type"] == "application/pdf"
            and response.content.startswith(b"%PDF"))


async def test_receipt_pdf(api):
    pid = await billed_property(api)
    payment = (await api.post(f"/api/v1/properties/{pid}/payments", json={
        "amount": 5000, "method": "upi", "paid_on": "2026-11-21"})).json()
    response = await api.get(f"/api/v1/payments/{payment['id']}/receipt.pdf")
    assert is_pdf(response)
    assert "Receipt R-2026-27-0001 Asha Naik.pdf" in response.headers["content-disposition"]

    await api.post(f"/api/v1/payments/{payment['id']}/void", json={"reason": "entered twice"})
    assert (await api.get(f"/api/v1/payments/{payment['id']}/receipt.pdf")).status_code == 400


async def test_bill_is_numbered_and_frozen(api):
    pid = await billed_property(api)
    await api.post(f"/api/v1/properties/{pid}/payments", json={"amount": 3000, "method": "cash", "paid_on": "2026-11-21"})

    first = (await api.post(f"/api/v1/properties/{pid}/bills", json={"issued_on": "2026-11-22"})).json()
    assert (first["bill_no"], first["total"], first["paid"], first["balance"]) == ("B/2026-27/0001", 7000, 3000, 4000)

    # Editing a charge later does not change an issued bill.
    detail = (await api.get(f"/api/v1/properties/{pid}")).json()
    await api.patch(f"/api/v1/charges/{detail['charges'][0]['id']}", json={"unit_price": 1})
    detail = (await api.get(f"/api/v1/properties/{pid}")).json()
    assert detail["bills"][0]["total"] == 7000

    await api.post(f"/api/v1/bills/{first['id']}/void", json={"reason": "wrong price"})
    second = (await api.post(f"/api/v1/properties/{pid}/bills", json={"issued_on": "2026-11-23"})).json()
    assert second["bill_no"] == "B/2026-27/0002"
    assert is_pdf(await api.get(f"/api/v1/bills/{second['id']}/pdf"))
    assert is_pdf(await api.get(f"/api/v1/bills/{first['id']}/pdf"))


async def test_bill_needs_charges(api):
    pid = (await new_client(api))["properties"][0]["id"]
    response = await api.post(f"/api/v1/properties/{pid}/bills", json={"issued_on": "2026-11-22"})
    assert response.status_code == 400


async def test_quote_accept_adds_charges(api):
    pid = (await new_client(api))["properties"][0]["id"]
    toilet = await catalog_item(api, "Toilet Blocker", 5)
    quote = (await api.post(f"/api/v1/properties/{pid}/quotes", json={
        "issued_on": "2026-11-20", "notes": "Valid for 30 days",
        "lines": [{"catalog_item_id": toilet["id"], "quantity": 4, "note": "Both toilets"},
                  {"description": "Installation", "unit_price": 1000}]})).json()
    assert (quote["quote_no"], quote["total"], quote["status"]) == ("Q/2026-27/0001", 7000, "open")
    assert is_pdf(await api.get(f"/api/v1/quotes/{quote['id']}/pdf"))

    accepted = (await api.post(f"/api/v1/quotes/{quote['id']}/accept", json={"charge_date": "2026-11-25"})).json()
    assert accepted["status"] == "accepted"
    detail = (await api.get(f"/api/v1/properties/{pid}")).json()
    assert detail["summary"]["billed"] == 7000
    assert {(c["description"], c["note"]) for c in detail["charges"]} == {
        ("Toilet Blocker (5ml)", "Both toilets"), ("Installation", None)}

    again = await api.post(f"/api/v1/quotes/{quote['id']}/accept", json={"charge_date": "2026-11-25"})
    assert again.status_code == 400


async def test_quote_decline(api):
    pid = (await new_client(api))["properties"][0]["id"]
    quote = (await api.post(f"/api/v1/properties/{pid}/quotes", json={
        "issued_on": "2026-11-20", "lines": [{"description": "Plot Vastu", "unit_price": 2500}]})).json()
    declined = (await api.post(f"/api/v1/quotes/{quote['id']}/void", json={"reason": "Too costly"})).json()
    assert declined["status"] == "declined"
    detail = (await api.get(f"/api/v1/properties/{pid}")).json()
    assert detail["summary"]["billed"] == 0 and detail["quotes"][0]["status"] == "declined"


async def test_report_pdf(api):
    pid = await billed_property(api)
    await api.post(f"/api/v1/properties/{pid}/visits", json={
        "visit_date": "2026-11-20", "purpose": "Site inspection", "observations": "Toilet in north-east"})
    await api.patch(f"/api/v1/properties/{pid}", json={"recommendations": "Shift the mandir to the north-east."})
    detail = (await api.get(f"/api/v1/properties/{pid}")).json()
    assert detail["recommendations"] == "Shift the mandir to the north-east."
    assert is_pdf(await api.get(f"/api/v1/properties/{pid}/report.pdf"))


@pytest.mark.parametrize("amount, words", [
    (0, "Rupees Zero Only"),
    (1500, "Rupees One Thousand Five Hundred Only"),
    (25500, "Rupees Twenty Five Thousand Five Hundred Only"),
    (465800, "Rupees Four Lakh Sixty Five Thousand Eight Hundred Only"),
    (10500000, "Rupees One Crore Five Lakh Only"),
])
def test_rupees_in_words(amount, words):
    assert rupees_in_words(amount) == words


def test_indian_number_grouping():
    assert [indian_number(n) for n in (500, 1500, 465800, 12345678)] == ["500", "1,500", "4,65,800", "1,23,45,678"]


def business(**overrides) -> Business:
    blank = {name: "" for name in Business.__dataclass_fields__}
    return Business(**blank | {"phones": [], "name": "Shree Vastu Vaibhav", "logo_data_uri": None,
                               "member_logo_data_uri": None, "gpay_data_uri": None} | overrides)


def test_upi_link_only_with_an_id_and_amount():
    assert upi_link(business(), 1000, "x") is None
    assert upi_link(business(upi_id="shop@okhdfcbank"), 0, "x") is None
    assert upi_link(business(upi_id="shop@okhdfcbank"), 4000, "B/2026-27/0001") == (
        "upi://pay?pa=shop%40okhdfcbank&pn=Shree%20Vastu%20Vaibhav&am=4000.00&cu=INR&tn=B%2F2026-27%2F0001")


def test_bill_html_shows_where_each_remedy_goes():
    line = SimpleNamespace(kind="charge", description="Door Blocker (15ml)", note="Shutter", quantity=2,
                           unit_price=2500, signed_amount=5000, charge_date=date(2026, 11, 20))
    bill = SimpleNamespace(bill_no="B/2026-27/0001", total=5000, paid=0, balance=5000, voided_at=None,
                           issued_on=date(2026, 11, 22), lines=[line])
    person = SimpleNamespace(name="Asha Naik", label="Flat 4", address=None, phone=None)
    html = render_html("bill.html", bill=bill, client=person, prop=person, payments=[], methods={}, due=5000,
                       upi_qr=None)
    assert "Door Blocker (15ml)" in html and "· Shutter" in html and "₹5,000" in html
