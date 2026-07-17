"""Reading supplier orders: pasted text and Odoo portal pages (synthetic fixtures)."""
from datetime import date
from pathlib import Path

import pytest

from app.services.supplier.parse import (
    OrderReadError, parse_order_list, parse_order_page, parse_pasted, rupees,
)

FIXTURES = Path(__file__).parent / "fixtures" / "supplier"


def fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_pasted_delivery_with_links():
    order = parse_pasted(fixture("pasted_delivery.txt"))
    assert (order.reference, order.order_date, order.total) == ("WH/OUT/00950", date(2026, 11, 2), 5100)
    products = [(l.description, l.product_ref, l.quantity, l.unit_price, l.size_ml) for l in order.lines if l.is_product]
    assert products == [
        ("Pendulum Board 6 inch", "20", 1, 300, None),
        ("Virtual Entry 5ml", "34", 4, 600, 5),
        ("Toilet Blocker 5ml", "36", 4, 600, 5),
    ]
    assert [(l.description, l.amount) for l in order.lines if not l.is_product] == [("Standard delivery", 0)]
    assert order.deliveries[0].number == "WH/OUT/00950" and order.deliveries[0].shipped


def test_pasted_order_as_tab_separated_columns_without_links():
    order = parse_pasted(fixture("pasted_order_tabs.txt"))
    assert (order.reference, order.total) == ("S00990", 2100)
    assert [l.product_ref for l in order.lines] == ["name:toilet blocker 5ml", "name:door blocker 15ml"]
    assert order.deliveries == []


def test_pasted_order_with_deliveries_is_filed_under_the_order_number():
    text = ("Sales Order - S00777\nOrder Date: 05/11/2026\nLast Delivery Orders\nWH/OUT/00300\n Shipped\nDate: 06/11/2026\n"
            "WH/OUT/00301\n Preparation\nToilet Blocker 5ml\t2.00 Units\t₹ 600\t₹ 1,200\nTotal\t₹ 1,200\n")
    order = parse_pasted(text)
    assert order.reference == "S00777"
    assert [(d.number, d.status, d.shipped) for d in order.deliveries] == [
        ("WH/OUT/00300", "Shipped", True), ("WH/OUT/00301", "Preparation", False)]


@pytest.mark.parametrize("text, message", [
    ("Toilet Blocker\n1.00 Units\n₹ 600\n₹ 600\nTotal ₹ 600", "No order or delivery number"),
    ("WH/OUT/1\nToilet Blocker\n1.00 Units\n₹ 600\n₹ 600\nTotal ₹ 600", "No date"),
    ("WH/OUT/1\nDate: 02/11/2026\nToilet Blocker\n2.00 Units\n₹ 600\n₹ 1,000\nTotal ₹ 1,000", "is not"),
    ("WH/OUT/1\nDate: 02/11/2026\nToilet Blocker\n1.00 Units\n₹ 600\n₹ 600\nTotal ₹ 900", "add up"),
])
def test_pasted_text_that_cannot_be_trusted_is_refused(text, message):
    with pytest.raises(OrderReadError, match=message):
        parse_pasted(text)


def test_order_page_on_the_way():
    order = parse_order_page(fixture("order_on_the_way.html"))
    assert (order.reference, order.external_id, order.order_date, order.total) == ("S01234", "1234", date(2026, 11, 10), 5800)
    assert [(l.product_ref, l.quantity, l.unit_price) for l in order.lines if l.is_product] == [
        ("36", 4, 600), ("70", 2, 900), ("46", 3, 600), ("20", 1, 300)]
    assert [(l.description, l.amount) for l in order.lines if not l.is_product] == [("Pay with eWallet", -500)]
    assert [(d.number, d.status, d.shipped) for d in order.deliveries] == [
        ("WH/OUT/00100", "Shipped", True), ("WH/OUT/00101", "Preparation", False)]


def test_order_page_with_a_return():
    order = parse_order_page(fixture("order_with_return.html"))
    assert [(d.number, d.is_return) for d in order.deliveries] == [("WH/OUT/00110", False), ("WH/IN/00007", True)]


def test_order_page_that_does_not_add_up_is_refused():
    with pytest.raises(OrderReadError, match="is not"):
        parse_order_page(fixture("order_does_not_add_up.html"))


def test_order_page_with_a_changed_layout_is_refused():
    with pytest.raises(OrderReadError):
        parse_order_page("<html><body><h2 id='quote_header_1'>Sales Order - S01</h2></body></html>")


def test_order_list_keeps_tokens_and_skips_pager_and_actions():
    links = parse_order_list(fixture("order_list_page1.html"))
    assert links == {"1300": "/my/orders/1300?access_token=tok-1300", "1234": "/my/orders/1234?access_token=tok-1234"}


@pytest.mark.parametrize("text, value", [("₹ 2,580", 2580), ("-﻿9,440", -9440), ("645.00", 645), ("₹\xa0329", 329)])
def test_rupees(text, value):
    assert rupees(text) == value


def test_rupees_refuses_paise():
    with pytest.raises(OrderReadError):
        rupees("645.50")
