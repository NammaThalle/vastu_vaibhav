"""Balances and status for properties, derived from their visits, charges and payments.

Nothing here is stored: status and balance are always recomputed, so they can never go
stale the way the old hand-set client status did.
"""
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from enum import StrEnum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Charge, Payment, Property, Visit
from app.models.enums import VisitStatus


class PropertyStatus(StrEnum):
    ENQUIRY = "enquiry"            # nothing billed yet
    IN_PROGRESS = "in_progress"    # billed and settled so far, but a visit is still scheduled
    PAYMENT_DUE = "payment_due"    # money is owed
    CLOSED = "closed"              # settled, or closed by hand


@dataclass(frozen=True)
class PropertySummary:
    billed: int
    paid: int
    balance: int
    status: PropertyStatus
    next_visit: date | None
    last_activity: date | None


def summarize(
    prop: Property,
    charges: Iterable[Charge],
    payments: Iterable[Payment],
    visits: Iterable[Visit],
    today: date,
) -> PropertySummary:
    live_charges = [c for c in charges if c.voided_at is None]
    live_payments = [p for p in payments if p.voided_at is None]
    visits = list(visits)

    billed = sum(c.signed_amount for c in live_charges)
    paid = sum(p.amount for p in live_payments)
    balance = billed - paid
    upcoming = sorted(v.visit_date for v in visits if v.status == VisitStatus.SCHEDULED and v.visit_date >= today)
    activity = [c.charge_date for c in live_charges] + [p.paid_on for p in live_payments] + [
        v.visit_date for v in visits if v.status == VisitStatus.DONE
    ]

    if prop.closed_at is not None:
        status = PropertyStatus.CLOSED
    elif balance > 0:
        status = PropertyStatus.PAYMENT_DUE
    elif upcoming:
        status = PropertyStatus.IN_PROGRESS
    elif not live_charges:
        status = PropertyStatus.ENQUIRY
    else:
        status = PropertyStatus.CLOSED

    return PropertySummary(
        billed=billed,
        paid=paid,
        balance=balance,
        status=status,
        next_visit=upcoming[0] if upcoming else None,
        last_activity=max(activity) if activity else None,
    )


# Order used to pick the most urgent status when a client has several properties.
STATUS_PRIORITY = [
    PropertyStatus.PAYMENT_DUE,
    PropertyStatus.IN_PROGRESS,
    PropertyStatus.ENQUIRY,
    PropertyStatus.CLOSED,
]


def most_urgent(statuses: Iterable[PropertyStatus]) -> PropertyStatus | None:
    present = set(statuses)
    return next((s for s in STATUS_PRIORITY if s in present), None)


IST = timezone(timedelta(hours=5, minutes=30))


def today() -> date:
    return datetime.now(IST).date()


async def summaries_for(session: AsyncSession, properties: list[Property]) -> dict[str, PropertySummary]:
    ids = [p.id for p in properties]
    grouped: dict[type, dict[str, list]] = {Charge: defaultdict(list), Payment: defaultdict(list), Visit: defaultdict(list)}
    for model in grouped:
        for row in await session.scalars(select(model).where(model.property_id.in_(ids))):
            grouped[model][row.property_id].append(row)
    day = today()
    return {
        p.id: summarize(p, grouped[Charge][p.id], grouped[Payment][p.id], grouped[Visit][p.id], day)
        for p in properties
    }
