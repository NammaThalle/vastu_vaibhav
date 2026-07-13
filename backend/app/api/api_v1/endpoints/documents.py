"""Receipts, bills, quotes and consultation reports, and their PDFs."""
from collections import OrderedDict
from datetime import datetime, timezone
from urllib.parse import quote as url_quote

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import DB, get_or_404
from app.documents.render import business, render_pdf, upi_qr
from app.models import Bill, BillLine, CatalogItem, Charge, Client, Payment, Property, Quote, QuoteLine, Visit
from app.models.enums import ItemKind, PaymentMethod, VisitStatus
from app.schemas.documents import BillCreate, BillOut, QuoteAccept, QuoteCreate, QuoteOut
from app.schemas.ledger import VoidRequest
from app.services.ledger import today
from app.services.numbering import fiscal_year, next_seq

router = APIRouter()

PDF = {200: {"content": {"application/pdf": {}}, "description": "A4 PDF"}}
METHODS = {PaymentMethod.CASH: "Cash", PaymentMethod.UPI: "UPI", PaymentMethod.BANK_TRANSFER: "Bank transfer",
           PaymentMethod.CHEQUE: "Cheque"}
PROPERTY_TYPES = {"apartment": "Apartment", "house": "House", "shop": "Shop", "office": "Office",
                  "factory": "Factory", "plot": "Plot"}


def now() -> datetime:
    return datetime.now(timezone.utc)


def pdf_response(content: bytes, title: str) -> Response:
    """Inline PDF with a readable file name, e.g. 'Bill B-2026-27-0001 Girish Sawkar.pdf'."""
    name = f"{title.replace('/', '-')}.pdf"
    ascii_name = name.encode("ascii", "ignore").decode() or "document.pdf"
    disposition = f'inline; filename="{ascii_name}"; filename*=UTF-8\'\'{url_quote(name)}'
    return Response(content, media_type="application/pdf", headers={"Content-Disposition": disposition})


async def property_and_client(db: DB, property_id: str) -> tuple[Property, Client]:
    prop = await get_or_404(db, Property, property_id)
    return prop, await db.get(Client, prop.client_id)


async def live_charges(db: DB, property_id: str) -> list[Charge]:
    return list(await db.scalars(
        select(Charge).where(Charge.property_id == property_id, Charge.voided_at.is_(None))
        .order_by(Charge.charge_date, Charge.created_at)))


async def live_payments(db: DB, property_id: str) -> list[Payment]:
    return list(await db.scalars(
        select(Payment).where(Payment.property_id == property_id, Payment.voided_at.is_(None))
        .order_by(Payment.paid_on, Payment.fiscal_year, Payment.receipt_seq)))


# Receipts

@router.get("/payments/{payment_id}/receipt.pdf", responses=PDF, response_class=Response)
async def receipt_pdf(payment_id: str, db: DB) -> Response:
    """Receipt for one payment, with the balance as it stood on that day."""
    payment = await get_or_404(db, Payment, payment_id)
    if payment.voided_at:
        raise HTTPException(status_code=400, detail="This payment was cancelled; there is no receipt to share")
    prop, client = await property_and_client(db, payment.property_id)
    billed = sum(c.signed_amount for c in await live_charges(db, prop.id) if c.charge_date <= payment.paid_on)
    payments = await live_payments(db, prop.id)
    paid = sum(p.amount for p in payments[:payments.index(payment) + 1])
    due = billed - paid
    pdf = await run_in_threadpool(
        render_pdf, "receipt.html", payment=payment, client=client, prop=prop, methods=METHODS,
        billed=billed, paid=paid, due=due, upi_qr=upi_qr(business(), due, f"{prop.label} balance"))
    return pdf_response(pdf, f"Receipt {payment.receipt_no} {client.name}")


# Bills

@router.post("/properties/{property_id}/bills", response_model=BillOut, status_code=201)
async def create_bill(property_id: str, body: BillCreate, db: DB) -> Bill:
    """Issue a numbered bill: a frozen copy of every current charge and the amount paid so far."""
    prop = await get_or_404(db, Property, property_id)
    charges = await live_charges(db, prop.id)
    if not charges:
        raise HTTPException(status_code=400, detail="Nothing has been billed for this property yet")
    paid = sum(p.amount for p in await live_payments(db, prop.id) if p.paid_on <= body.issued_on)
    fy = fiscal_year(body.issued_on)
    bill = Bill(property_id=prop.id, issued_on=body.issued_on, fiscal_year=fy,
                bill_seq=await next_seq(db, "bill", fy), paid=paid)
    bill.lines = [
        BillLine(position=i, kind=c.kind, description=c.description, note=c.note, quantity=c.quantity,
                 unit_price=c.unit_price, charge_date=c.charge_date)
        for i, c in enumerate(charges, start=1)
    ]
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


@router.post("/bills/{bill_id}/void", response_model=BillOut)
async def void_bill(bill_id: str, body: VoidRequest, db: DB) -> Bill:
    bill = await get_or_404(db, Bill, bill_id)
    bill.voided_at, bill.void_reason = now(), body.reason
    await db.commit()
    await db.refresh(bill)
    return bill


@router.get("/bills/{bill_id}/pdf", responses=PDF, response_class=Response)
async def bill_pdf(bill_id: str, db: DB) -> Response:
    bill = await get_or_404(db, Bill, bill_id)
    prop, client = await property_and_client(db, bill.property_id)
    payments = [p for p in await live_payments(db, prop.id) if p.paid_on <= bill.issued_on]
    pdf = await run_in_threadpool(
        render_pdf, "bill.html", bill=bill, client=client, prop=prop, payments=payments, methods=METHODS,
        due=bill.balance, upi_qr=None if bill.voided_at else upi_qr(business(), bill.balance, bill.bill_no))
    return pdf_response(pdf, f"Bill {bill.bill_no} {client.name}")


# Quotes

@router.post("/properties/{property_id}/quotes", response_model=QuoteOut, status_code=201)
async def create_quote(property_id: str, body: QuoteCreate, db: DB) -> QuoteOut:
    await get_or_404(db, Property, property_id)
    fy = fiscal_year(body.issued_on)
    quote = Quote(property_id=property_id, issued_on=body.issued_on, fiscal_year=fy,
                  quote_seq=await next_seq(db, "quote", fy), notes=(body.notes or "").strip() or None)
    lines = []
    for i, line in enumerate(body.lines, start=1):
        item = await get_or_404(db, CatalogItem, line.catalog_item_id) if line.catalog_item_id else None
        lines.append(QuoteLine(
            position=i, catalog_item_id=item.id if item else None, kind=line.kind,
            description=line.description or (f"{item.name} ({item.size_ml}ml)" if item.size_ml else item.name),
            note=(line.note or "").strip() or None, quantity=line.quantity,
            unit_price=line.unit_price if line.unit_price is not None else item.unit_price))
    quote.lines = lines
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return QuoteOut.of(quote)


async def open_quote(db: DB, quote_id: str) -> Quote:
    quote = await get_or_404(db, Quote, quote_id)
    if quote.accepted_at or quote.voided_at:
        raise HTTPException(status_code=400, detail="This quote was already accepted or declined")
    return quote


@router.post("/quotes/{quote_id}/accept", response_model=QuoteOut)
async def accept_quote(quote_id: str, body: QuoteAccept, db: DB) -> QuoteOut:
    """Add every line of the quote to the property's bill as charges."""
    quote = await open_quote(db, quote_id)
    for line in quote.lines:
        db.add(Charge(property_id=quote.property_id, catalog_item_id=line.catalog_item_id, kind=line.kind,
                      description=line.description, note=line.note, quantity=line.quantity,
                      unit_price=line.unit_price, charge_date=body.charge_date))
    quote.accepted_at = now()
    await db.commit()
    await db.refresh(quote)
    return QuoteOut.of(quote)


@router.post("/quotes/{quote_id}/void", response_model=QuoteOut)
async def decline_quote(quote_id: str, body: VoidRequest, db: DB) -> QuoteOut:
    quote = await open_quote(db, quote_id)
    quote.voided_at, quote.void_reason = now(), body.reason
    await db.commit()
    await db.refresh(quote)
    return QuoteOut.of(quote)


@router.get("/quotes/{quote_id}/pdf", responses=PDF, response_class=Response)
async def quote_pdf(quote_id: str, db: DB) -> Response:
    quote = await get_or_404(db, Quote, quote_id)
    prop, client = await property_and_client(db, quote.property_id)
    pdf = await run_in_threadpool(render_pdf, "quote.html", quote=quote, client=client, prop=prop)
    return pdf_response(pdf, f"Quote {quote.quote_no} {client.name}")


# Consultation report

@router.get("/properties/{property_id}/report.pdf", responses=PDF, response_class=Response)
async def report_pdf(property_id: str, db: DB) -> Response:
    """Written summary, remedies with where they go, and every completed visit's observations.
    No prices: this is the document the client keeps."""
    prop, client = await property_and_client(db, property_id)
    visits = list(await db.scalars(
        select(Visit).where(Visit.property_id == prop.id, Visit.status == VisitStatus.DONE)
        .order_by(Visit.visit_date, Visit.created_at)))
    remedy_rows = await db.execute(
        select(Charge).join(CatalogItem, Charge.catalog_item_id == CatalogItem.id)
        .where(Charge.property_id == prop.id, Charge.voided_at.is_(None), CatalogItem.kind == ItemKind.REMEDY)
        .order_by(Charge.charge_date, Charge.created_at))
    grouped: OrderedDict[tuple[str, str | None], int] = OrderedDict()
    for (charge,) in remedy_rows:
        key = (charge.description, charge.note)
        grouped[key] = grouped.get(key, 0) + charge.quantity
    remedies = [{"name": name, "note": note, "quantity": qty} for (name, note), qty in grouped.items()]
    pdf = await run_in_threadpool(
        render_pdf, "report.html", client=client, prop=prop, visits=visits, remedies=remedies,
        today=today(), property_type=PROPERTY_TYPES.get(prop.property_type))
    return pdf_response(pdf, f"Vastu report {prop.label} {client.name}")
