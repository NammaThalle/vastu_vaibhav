from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import DB
from app.models import CatalogItem, Client, Payment, Property, SyncRun, Visit
from app.models.enums import VisitStatus
from app.schemas.home import DueItem, HomeSummary, LowStockItem, UpcomingVisit
from app.services.ledger import summaries_for, today
from app.services.stock import stock_levels

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

    # Stock warnings only make sense once a count exists; before that every remedy reads zero.
    levels = await stock_levels(db)
    counted = any(level.counted_on for level in levels.values())
    items = {i.id: i for i in await db.scalars(select(CatalogItem).where(CatalogItem.id.in_(list(levels))))}
    low = sorted(
        (LowStockItem(catalog_item_id=l.catalog_item_id, name=items[l.catalog_item_id].name,
                      size_ml=items[l.catalog_item_id].size_ml, in_stock=l.in_stock)
         for l in levels.values() if l.low and l.counted_on is not None),
        key=lambda x: (x.in_stock, x.name),
    )
    last_sync = await db.scalar(select(SyncRun).where(SyncRun.finished_at.is_not(None))
                                .order_by(SyncRun.started_at.desc()))

    return HomeSummary(
        outstanding_total=sum(d.balance for d in dues),
        collected_this_month=collected,
        dues=dues,
        upcoming_visits=upcoming,
        low_stock=low,
        stock_counted=counted,
        supplier_problem=last_sync.message if last_sync and last_sync.ok is False else None,
    )
