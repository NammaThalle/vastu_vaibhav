"""A property and everything recorded against it: visits, charges and payments."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.api_v1.endpoints.clients import with_summary
from app.api.deps import DB, get_or_404
from app.models import CatalogItem, Charge, Client, Payment, Property, Visit
from app.schemas.clients import ClientRef, PropertyDetail, PropertyUpdate
from app.schemas.ledger import (
    ChargeOut, ChargesCreate, ChargeUpdate, PaymentCreate, PaymentOut, PaymentUpdate, VisitCreate, VisitOut,
    VisitUpdate, VoidRequest,
)
from app.services.ledger import summaries_for
from app.services.numbering import fiscal_year, next_receipt_seq

router = APIRouter()


def now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/properties/{property_id}", response_model=PropertyDetail)
async def get_property(property_id: str, db: DB) -> PropertyDetail:
    prop = await get_or_404(db, Property, property_id)
    client = await db.get(Client, prop.client_id)
    summary = (await summaries_for(db, [prop]))[prop.id]
    visits = await db.scalars(select(Visit).where(Visit.property_id == property_id)
                              .order_by(Visit.visit_date.desc(), Visit.created_at.desc()))
    charges = await db.scalars(select(Charge).where(Charge.property_id == property_id)
                               .order_by(Charge.charge_date.desc(), Charge.created_at.desc()))
    payments = await db.scalars(select(Payment).where(Payment.property_id == property_id)
                                .order_by(Payment.paid_on.desc(), Payment.created_at.desc()))
    return PropertyDetail(
        **with_summary(prop, summary).model_dump(),
        client=ClientRef.model_validate(client),
        visits=[VisitOut.model_validate(v) for v in visits],
        charges=[ChargeOut.model_validate(c) for c in charges],
        payments=[PaymentOut.model_validate(p) for p in payments],
    )


@router.patch("/properties/{property_id}", response_model=PropertyDetail)
async def update_property(property_id: str, body: PropertyUpdate, db: DB) -> PropertyDetail:
    prop = await get_or_404(db, Property, property_id)
    data = body.model_dump(exclude_unset=True)
    if "closed" in data:
        closed = data.pop("closed")
        prop.closed_at = (prop.closed_at or now()) if closed else None
    for field, value in data.items():
        setattr(prop, field, value)
    await db.commit()
    return await get_property(property_id, db)


# Visits

@router.post("/properties/{property_id}/visits", response_model=VisitOut, status_code=201)
async def add_visit(property_id: str, body: VisitCreate, db: DB) -> Visit:
    await get_or_404(db, Property, property_id)
    visit = Visit(property_id=property_id, **body.model_dump())
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return visit


@router.patch("/visits/{visit_id}", response_model=VisitOut)
async def update_visit(visit_id: str, body: VisitUpdate, db: DB) -> Visit:
    visit = await get_or_404(db, Visit, visit_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(visit, field, value)
    await db.commit()
    await db.refresh(visit)
    return visit


# Charges

@router.post("/properties/{property_id}/charges", response_model=list[ChargeOut], status_code=201)
async def add_charges(property_id: str, body: ChargesCreate, db: DB) -> list[Charge]:
    """Add one or more lines in one go, e.g. every remedy sold on a visit."""
    await get_or_404(db, Property, property_id)
    if body.visit_id:
        visit = await get_or_404(db, Visit, body.visit_id)
        if visit.property_id != property_id:
            raise HTTPException(status_code=400, detail="That visit belongs to another property")

    created = []
    for line in body.lines:
        item = await get_or_404(db, CatalogItem, line.catalog_item_id) if line.catalog_item_id else None
        description = line.description or (
            f"{item.name} ({item.size_ml}ml)" if item and item.size_ml else item.name)
        charge = Charge(
            property_id=property_id,
            visit_id=body.visit_id,
            catalog_item_id=item.id if item else None,
            kind=line.kind,
            description=description,
            quantity=line.quantity,
            unit_price=line.unit_price if line.unit_price is not None else item.unit_price,
            charge_date=body.charge_date,
        )
        db.add(charge)
        created.append(charge)
    await db.commit()
    for charge in created:
        await db.refresh(charge)
    return created


@router.patch("/charges/{charge_id}", response_model=ChargeOut)
async def update_charge(charge_id: str, body: ChargeUpdate, db: DB) -> Charge:
    charge = await get_or_404(db, Charge, charge_id)
    if charge.voided_at:
        raise HTTPException(status_code=400, detail="A voided line cannot be edited")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(charge, field, value)
    await db.commit()
    await db.refresh(charge)
    return charge


@router.post("/charges/{charge_id}/void", response_model=ChargeOut)
async def void_charge(charge_id: str, body: VoidRequest, db: DB) -> Charge:
    charge = await get_or_404(db, Charge, charge_id)
    charge.voided_at, charge.void_reason = now(), body.reason
    await db.commit()
    await db.refresh(charge)
    return charge


# Payments

@router.post("/properties/{property_id}/payments", response_model=PaymentOut, status_code=201)
async def add_payment(property_id: str, body: PaymentCreate, db: DB) -> Payment:
    await get_or_404(db, Property, property_id)
    fy = fiscal_year(body.paid_on)
    payment = Payment(property_id=property_id, fiscal_year=fy,
                      receipt_seq=await next_receipt_seq(db, fy), **body.model_dump())
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.patch("/payments/{payment_id}", response_model=PaymentOut)
async def update_payment(payment_id: str, body: PaymentUpdate, db: DB) -> Payment:
    """Edits keep the receipt number, even if the date moves into another financial year."""
    payment = await get_or_404(db, Payment, payment_id)
    if payment.voided_at:
        raise HTTPException(status_code=400, detail="A voided payment cannot be edited")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.post("/payments/{payment_id}/void", response_model=PaymentOut)
async def void_payment(payment_id: str, body: VoidRequest, db: DB) -> Payment:
    payment = await get_or_404(db, Payment, payment_id)
    payment.voided_at, payment.void_reason = now(), body.reason
    await db.commit()
    await db.refresh(payment)
    return payment
