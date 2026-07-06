from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import DB
from app.models import Client, Payment, Property, Visit
from app.models.enums import VisitStatus
from app.schemas.home import DueItem, HomeSummary, UpcomingVisit
from app.services.ledger import summaries_for, today

router = APIRouter()


@router.get("", response_model=HomeSummary)
async def home(db: DB) -> HomeSummary:
    day = today()
    properties = list(await db.scalars(select(Property)))
    clients = {c.id: c for c in await db.scalars(select(Client))}
    by_id = {p.id: p for p in properties}
    summaries = await summaries_for(db, properties)

    dues = sorted(
        (
            DueItem(property_id=p.id, client_id=p.client_id, client_name=clients[p.client_id].name,
                    phone=clients[p.client_id].phone, label=p.label, balance=summaries[p.id].balance,
                    last_activity=summaries[p.id].last_activity)
            for p in properties
            if summaries[p.id].balance > 0 and p.closed_at is None
        ),
        key=lambda d: (d.last_activity or day, -d.balance),
    )

    upcoming = []
    for visit in await db.scalars(select(Visit).where(Visit.status == VisitStatus.SCHEDULED, Visit.visit_date >= day)
                                  .order_by(Visit.visit_date).limit(20)):
        prop = by_id[visit.property_id]
        upcoming.append(UpcomingVisit(visit_id=visit.id, property_id=prop.id,
                                      client_name=clients[prop.client_id].name, label=prop.label,
                                      visit_date=visit.visit_date, purpose=visit.purpose))

    collected = await db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.voided_at.is_(None), Payment.paid_on >= day.replace(day=1)))

    return HomeSummary(
        outstanding_total=sum(d.balance for d in dues),
        collected_this_month=collected,
        dues=dues,
        upcoming_visits=upcoming,
    )
