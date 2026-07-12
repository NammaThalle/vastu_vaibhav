import base64
import mimetypes
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote, urlencode

import segno
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.core.config import get_config_path, settings
from app.documents.words import rupees_in_words

TEMPLATES = Path(__file__).parent / "templates"
ASSETS = Path(__file__).parent / "assets"


def data_uri(path: Path) -> str | None:
    if not path.is_file():
        return None
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def indian_number(n: int) -> str:
    """465800 -> '4,65,800'."""
    sign, digits = ("-" if n < 0 else ""), str(abs(n))
    if len(digits) <= 3:
        return sign + digits
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return sign + ",".join(groups + [tail])


def rupees(n: int) -> str:
    return ("-" if n < 0 else "") + "₹" + indian_number(abs(n))


def long_date(day: date) -> str:
    return f"{day.day} {day:%b %Y}"


@dataclass(frozen=True)
class Business:
    name: str
    tagline: str
    phones: list[str]
    email: str
    website: str
    address: str
    bank_name: str
    account_no: str
    ifsc: str
    gpay_phone: str
    upi_id: str
    color: str
    logo_initial: str
    logo_data_uri: str | None
    member_logo_data_uri: str | None
    gpay_data_uri: str | None


def business() -> Business:
    """Read on every render, so a new logo in the config folder shows up without a restart.
    A logo named by invoice.logoFile in the config folder replaces the built-in one."""
    cfg = settings.APP_CONFIG
    project, contact, payment, invoice = (cfg.get(k, {}) for k in ("project", "contact", "payment", "invoice"))
    custom = invoice.get("logoFile")
    logo_uri = (data_uri(get_config_path().parent / custom) if custom else None) or data_uri(ASSETS / "logo.jpg")
    return Business(
        name=project.get("name", "Shree Vastu Vaibhav"),
        tagline=project.get("tagline", ""),
        phones=[p for p in (contact.get("phone"), contact.get("secondaryPhone")) if p],
        email=contact.get("email", ""),
        website=contact.get("website", ""),
        address=contact.get("address", ""),
        bank_name=payment.get("bankName", ""),
        account_no=payment.get("accountNo", ""),
        ifsc=payment.get("ifsc", ""),
        gpay_phone=contact.get("gpayPhone", ""),
        upi_id=payment.get("upiId", ""),
        color=invoice.get("primaryColor", "#233f99"),
        logo_initial=invoice.get("logoInitial", "V"),
        logo_data_uri=logo_uri,
        member_logo_data_uri=data_uri(ASSETS / "bni.png") if invoice.get("memberLabel") else None,
        gpay_data_uri=data_uri(ASSETS / "gpay.png"),
    )


def upi_link(biz: Business, amount: int, note: str) -> str | None:
    """A UPI payment link for the exact amount, or None until a UPI ID is configured."""
    if not biz.upi_id or amount <= 0:
        return None
    params = urlencode({"pa": biz.upi_id, "pn": biz.name, "am": f"{amount}.00", "cu": "INR", "tn": note},
                       quote_via=quote)
    return f"upi://pay?{params}"


def upi_qr(biz: Business, amount: int, note: str) -> str | None:
    """The UPI link as an inline SVG QR code for the PDF."""
    link = upi_link(biz, amount, note)
    if link is None:
        return None
    return segno.make(link, error="m").svg_data_uri(scale=4, border=1)


@lru_cache
def environment() -> Environment:
    env = Environment(loader=FileSystemLoader(TEMPLATES), autoescape=select_autoescape(["html"]))
    env.filters.update(rupees=rupees, long_date=long_date, in_words=rupees_in_words)
    return env


def render_html(template: str, **context) -> str:
    return environment().get_template(template).render(biz=business(), **context)


def render_pdf(template: str, **context) -> bytes:
    """Blocking: call from a worker thread in async code."""
    return HTML(string=render_html(template, **context), base_url=str(TEMPLATES)).write_pdf()
