"""Read supplier orders into plain data, from pasted text or from Odoo portal pages.

Nothing here guesses. Every product line must satisfy quantity x price = amount, and the
lines must add up to the order total; anything else raises OrderReadError, so a changed
page layout fails loudly instead of producing wrong stock.
"""
import re
from dataclasses import dataclass, field
from datetime import date

from bs4 import BeautifulSoup

ORDER_REF = re.compile(r"\b(S\d{4,})\b")
DELIVERY_REF = re.compile(r"\b(WH/(?:OUT|IN)/\d+)\b")
SHOP_LINK = re.compile(r"/shop/([a-z0-9\-]+?)-(\d+)(?:[/?#].*)?$")
SIZE = re.compile(r"(\d+)\s*ml\b", re.I)
DATE = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})")
QTY = re.compile(r"^(-?[\d,]+(?:\.\d+)?)\s*(?:Units?|Unit\(s\)|Nos?|Pcs?|pieces?)?$", re.I)
MONEY = re.compile(r"^(-?)\s*₹\s*(-?)\s*([\d,]+(?:\.\d+)?)$")


class OrderReadError(ValueError):
    """The text or page could not be read with certainty."""


@dataclass
class ParsedLine:
    description: str
    quantity: int
    unit_price: int
    amount: int
    product_ref: str | None = None   # supplier product number, or None for extras

    @property
    def is_product(self) -> bool:
        return self.product_ref is not None

    @property
    def size_ml(self) -> int | None:
        match = SIZE.search(self.description)
        return int(match.group(1)) if match else None


@dataclass
class ParsedDelivery:
    number: str
    status: str
    delivery_date: date | None

    @property
    def is_return(self) -> bool:
        return self.number.startswith("WH/IN/")

    @property
    def shipped(self) -> bool:
        return self.status.strip().lower() in {"shipped", "delivered", "done", "received"}


@dataclass
class ParsedOrder:
    reference: str
    order_date: date
    total: int
    lines: list[ParsedLine]
    deliveries: list[ParsedDelivery] = field(default_factory=list)
    external_id: str | None = None
    cancelled: bool = False

    def check(self) -> "ParsedOrder":
        if not self.lines:
            raise OrderReadError(f"{self.reference}: no lines found")
        for line in self.lines:
            if line.quantity * line.unit_price != line.amount:
                raise OrderReadError(
                    f"{self.reference}: {line.description}: {line.quantity} x {line.unit_price} is not {line.amount}")
        if sum(line.amount for line in self.lines) != self.total:
            raise OrderReadError(f"{self.reference}: lines add up to {sum(l.amount for l in self.lines)}, "
                                 f"but the total is {self.total}")
        return self


# Small helpers

def rupees(text: str) -> int:
    """'₹ 2,580', '-9,440', '645.00' -> whole rupees. Paise are refused, not rounded."""
    cleaned = text.replace("﻿", "").replace("​", "").replace("\xa0", " ").replace("₹", "")
    cleaned = cleaned.replace(",", "").replace(" ", "")
    value = float(cleaned)
    if value != int(value):
        raise OrderReadError(f"Amount {text!r} has paise")
    return int(value)


def quantity(text: str) -> int:
    value = float(text.replace(",", ""))
    if value != int(value):
        raise OrderReadError(f"Quantity {text!r} is not a whole number")
    return int(value)


def day_first(text: str) -> date | None:
    match = DATE.search(text)
    if not match:
        return None
    d, m, y = (int(g) for g in match.groups())
    return date(y, m, d)


def product_ref(href: str | None) -> str | None:
    if not href:
        return None
    match = SHOP_LINK.search(href)
    return match.group(2) if match else None


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


# Pasted text

LINK = re.compile(r"^\[(.+?)\]\((\S+)\)$")


def parse_pasted(text: str) -> ParsedOrder:
    """Text copied from the supplier's order or delivery page.

    Each line of the order is four values in a row (name, quantity, unit price, amount),
    whether the browser copied them as separate lines or as tab-separated columns. Names may
    keep their shop links in Markdown form ([Name](https://.../shop/name-34)).
    """
    cells: list[str] = []
    for raw in text.splitlines():
        cells += [clean(part) for part in raw.split("\t") if clean(part)]

    reference = (DELIVERY_REF.search(text) or ORDER_REF.search(text))
    if not reference:
        raise OrderReadError("No order or delivery number (S08284 or WH/OUT/01261) found in the pasted text")
    dated = re.search(r"(?:Order\s+)?Date:?\s*(\d{1,2}/\d{1,2}/\d{4})", text, re.I)
    order_date = day_first(dated.group(1)) if dated else None
    if order_date is None:
        raise OrderReadError("No date (DD/MM/YYYY) found in the pasted text")
    total_match = re.search(r"\bTotal\b[^\d\-₹]*(₹?\s*-?[\d,]+(?:\.\d+)?)", text)
    if not total_match:
        raise OrderReadError("No Total found in the pasted text")

    lines: list[ParsedLine] = []
    i = 0
    while i + 3 < len(cells):
        q, p, a = QTY.match(cells[i + 1]), MONEY.match(cells[i + 2]), MONEY.match(cells[i + 3])
        name_cell = cells[i]
        if q and p and a and not MONEY.match(name_cell) and not QTY.match(name_cell):
            link = LINK.match(name_cell)
            name = link.group(1) if link else name_cell
            ref = product_ref(link.group(2)) if link else None
            if ref is None and not re.search(r"delivery|shipping|wallet|discount|coupon|loyalty", name, re.I):
                ref = "name:" + name.lower()
            lines.append(ParsedLine(
                description=name, quantity=quantity(q.group(1)), unit_price=rupees(cells[i + 2]),
                amount=rupees(cells[i + 3]), product_ref=ref))
            i += 4
        else:
            i += 1

    delivery = ParsedDelivery(reference.group(1), "Shipped", order_date) if reference.group(1).startswith("WH/") else None
    return ParsedOrder(
        reference=reference.group(1), order_date=order_date, total=rupees(total_match.group(1)), lines=lines,
        deliveries=[delivery] if delivery else [],
    ).check()


# Odoo portal pages

def parse_order_list(page: str) -> dict[str, str]:
    """Order list page -> {portal order id: link}. Links keep their access token."""
    soup = BeautifulSoup(page, "html.parser")
    found: dict[str, str] = {}
    for anchor in soup.find_all("a", href=True):
        match = re.search(r"/my/orders/(\d+)(?:\?[^#]*)?", anchor["href"])
        if match and "/my/orders/" in anchor["href"] and not re.search(r"/my/orders/\d+/", anchor["href"]):
            found.setdefault(match.group(1), anchor["href"].split("#")[0])
    return found


def parse_order_page(page: str) -> ParsedOrder:
    """One sales order page from the Odoo customer portal."""
    soup = BeautifulSoup(page, "html.parser")

    header = soup.find(id="quote_header_1") or soup.find(id="introduction")
    reference_match = ORDER_REF.search(header.get_text(" ") if header else soup.get_text(" "))
    if not reference_match:
        raise OrderReadError("No order number on the page")
    reference = reference_match.group(1)

    info = soup.find(id="sale_info_table") or soup.find(id="sale_info")
    order_date = day_first(info.get_text(" ")) if info else None
    if order_date is None:
        raise OrderReadError(f"{reference}: no order date on the page")

    table = soup.find(id="sales_order_table")
    if table is None:
        raise OrderReadError(f"{reference}: the order lines table is missing; the page layout may have changed")
    lines: list[ParsedLine] = []
    for row in table.select('tr[name="tr_product"]'):
        name_cell = row.find(attrs={"name": "td_product_name"})
        qty_cell = row.find(attrs={"name": "td_product_quantity"})
        price_cell = row.find(attrs={"name": "td_product_priceunit"})
        amount_cell = row.find(attrs={"name": "td_product_subtotal"})
        if not (name_cell and qty_cell and price_cell and amount_cell):
            raise OrderReadError(f"{reference}: a line is missing a column")
        link = name_cell.find("a", href=True)
        qty_text = clean(qty_cell.get_text(" ")).split(" ")[0]
        lines.append(ParsedLine(
            description=clean(name_cell.get_text(" ")),
            quantity=quantity(qty_text),
            unit_price=rupees(clean(price_cell.get_text(" "))),
            amount=rupees(clean(amount_cell.get_text(" "))),
            product_ref=product_ref(link["href"]) if link else None,
        ))

    totals = soup.find(attrs={"name": "sale_order_totals_table"})
    total_row = totals.find(class_="o_total") if totals else None
    if total_row is None:
        raise OrderReadError(f"{reference}: no order total on the page")
    total = rupees(clean(total_row.find_all("td")[-1].get_text(" ")))

    deliveries = []
    for block in soup.find_all(attrs={"name": re.compile(r"^(delivery_order|return)$")}):
        number = DELIVERY_REF.search(block.get_text(" "))
        if not number:
            continue
        badge = block.find(class_=re.compile(r"\bbadge\b"))
        status = clean(badge.get_text(" ")) if badge else "Unknown"
        deliveries.append(ParsedDelivery(number.group(1), status, day_first(block.get_text(" "))))

    text = soup.get_text(" ").lower()
    cancelled = "this order has been cancelled" in text or "order cancelled" in text
    # The page links to other orders too; take the id from this order's own actions.
    own = re.search(r"/my/orders/(\d+)/(?:decline|download_edi|accept)", page) or re.search(
        r'data-res_model="sale.order"[^>]*data-res_id="(\d+)"', page)
    external_id = own.group(1) if own else None
    return ParsedOrder(reference=reference, order_date=order_date, total=total, lines=lines,
                       deliveries=deliveries, external_id=external_id, cancelled=cancelled).check()
