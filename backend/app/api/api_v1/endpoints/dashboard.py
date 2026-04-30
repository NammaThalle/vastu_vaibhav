from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, List, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.client import Client as ClientModel
from app.models.payment import Payment as PaymentModel
from app.models.service import ServiceEntry as ServiceModel
from app.models.visit import Visit as VisitModel
from app.schemas.dashboard import DashboardActivityItem, DashboardSummary
from app.utils.logger import logger

router = APIRouter()

OVERDUE_DAYS = 30


def _normalize_dt(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _entry_type(service: ServiceModel) -> str:
    return getattr(service, "entry_type", None) or "charge"


def _apply_credit(remaining: deque[Tuple[datetime, float]], credit_amount: float) -> None:
    while credit_amount > 0 and remaining:
        lot_date, lot_amount = remaining[0]
        applied = min(lot_amount, credit_amount)
        lot_amount -= applied
        credit_amount -= applied
        if lot_amount <= 0:
            remaining.popleft()
        else:
            remaining[0] = (lot_date, lot_amount)


def _build_lots(client: ClientModel, services: Iterable[ServiceModel]) -> List[Tuple[datetime, float]]:
    lots: List[Tuple[datetime, float]] = []
    client_created_at = _normalize_dt(client.created_at)
    if client.total_fees_fixed and client.total_fees_fixed > 0 and client_created_at:
        lots.append((client_created_at, float(client.total_fees_fixed)))

    for service in sorted(services, key=lambda item: _normalize_dt(item.date) or datetime.min.replace(tzinfo=timezone.utc)):
        if _entry_type(service) != "charge":
            continue
        service_date = _normalize_dt(service.date) or client_created_at or datetime.now(timezone.utc)
        lots.append((service_date, float(service.amount)))

    return lots


def _apply_credits(
    lots: List[Tuple[datetime, float]],
    services: Iterable[ServiceModel],
    payments: Iterable[PaymentModel],
) -> deque[Tuple[datetime, float]]:
    remaining: deque[Tuple[datetime, float]] = deque(lots)
    credit_events: list[Tuple[datetime, float]] = []

    for service in services:
        if _entry_type(service) == "discount":
            credit_events.append((
                _normalize_dt(service.date) or datetime.min.replace(tzinfo=timezone.utc),
                float(service.amount),
            ))

    for payment in payments:
        credit_events.append((
            _normalize_dt(payment.date) or datetime.min.replace(tzinfo=timezone.utc),
            float(payment.amount),
        ))

    for _, credit_amount in sorted(credit_events, key=lambda item: item[0]):
        _apply_credit(remaining, credit_amount)

    return remaining


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    db: AsyncSession = Depends(deps.get_db),
    period: str = "month",
) -> Any:
    now = datetime.now(timezone.utc)
    
    if period == "year":
        period_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "total":
        period_start = datetime.min.replace(tzinfo=timezone.utc)
    else: # default to month
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    overdue_cutoff = now - timedelta(days=OVERDUE_DAYS)
    week_start = now - timedelta(days=7)

    clients_result = await db.execute(select(ClientModel))
    clients = clients_result.scalars().all()

    services_result = await db.execute(select(ServiceModel))
    service_entries = services_result.scalars().all()

    payments_result = await db.execute(select(PaymentModel))
    payments = payments_result.scalars().all()

    visits_result = await db.execute(
        select(VisitModel).options(selectinload(VisitModel.client)).order_by(VisitModel.created_at.desc()).limit(3)
    )
    recent_visits = visits_result.scalars().all()

    total_visits_result = await db.execute(select(func.count(VisitModel.id)))
    total_visits = int(total_visits_result.scalar_one())

    collected_this_period_result = await db.execute(
        select(func.coalesce(func.sum(PaymentModel.amount), 0.0)).where(PaymentModel.date >= period_start)
    )
    collected_this_period = float(collected_this_period_result.scalar_one() or 0.0)

    goal_for_period = 0.0
    pending_balance = 0.0
    overdue_balance = 0.0
    total_revenue = 0.0
    new_clients_count = 0
    new_visits_count = 0

    services_by_client: dict[str, list[ServiceModel]] = defaultdict(list)
    payments_by_client: dict[str, list[PaymentModel]] = defaultdict(list)

    for service in service_entries:
        services_by_client[service.client_id].append(service)

    for payment in payments:
        payments_by_client[payment.client_id].append(payment)

    for client in clients:
        services = sorted(
            services_by_client.get(client.id, []),
            key=lambda item: _normalize_dt(item.date) or datetime.min.replace(tzinfo=timezone.utc),
        )
        payments = sorted(
            payments_by_client.get(client.id, []),
            key=lambda item: _normalize_dt(item.date) or datetime.min.replace(tzinfo=timezone.utc),
        )

        lots = _build_lots(client, services)
        remaining_lots = _apply_credits(lots, services, payments)

        pending_for_client = sum(amount for _, amount in remaining_lots)
        overdue_for_client = sum(amount for lot_date, amount in remaining_lots if lot_date <= overdue_cutoff)
        pending_balance += pending_for_client
        overdue_balance += overdue_for_client

        if client.created_at and _normalize_dt(client.created_at) >= period_start:
            new_clients_count += 1

        for lot_date, amount in lots:
            total_revenue += amount
            if lot_date >= period_start:
                goal_for_period += amount

        for service in services:
            if _entry_type(service) != "discount":
                continue
            discount_date = _normalize_dt(service.date) or datetime.min.replace(tzinfo=timezone.utc)
            discount_amount = float(service.amount)
            total_revenue -= discount_amount
            if discount_date >= period_start:
                goal_for_period -= discount_amount

    logger.debug("Dashboard summary calculated: revenue=%s, pending=%s, overdue=%s", total_revenue, pending_balance, overdue_balance)

    visits_this_week_result = await db.execute(
        select(func.count(VisitModel.id)).where(VisitModel.created_at >= week_start)
    )
    new_visits_count = int(visits_this_week_result.scalar_one())

    goal_completion = round((collected_this_period / goal_for_period) * 100, 2) if goal_for_period > 0 else 0.0

    activity_items = []
    for visit in recent_visits:
        visit_time = _normalize_dt(visit.created_at or visit.date) or now
        client_name = visit.client.full_name if visit.client else "Unknown client"
        activity_items.append(
            DashboardActivityItem(
                id=visit.id,
                title=f"Consultation booked with {client_name}",
                subtitle=visit.purpose or "Client visit recorded",
                when=visit_time,
            )
        )

    new_clients_trend = f"+{new_clients_count} this {period}"
    new_visits_trend = f"+{new_visits_count} since last week"

    return DashboardSummary(
        total_clients=len(clients),
        new_clients_trend=new_clients_trend,
        total_visits=total_visits,
        new_visits_trend=new_visits_trend,
        collected_this_period=collected_this_period,
        goal_for_period=goal_for_period,
        goal_completion=goal_completion,
        pending_balance=pending_balance,
        overdue_balance=overdue_balance,
        total_revenue=total_revenue,
        recent_activity=activity_items,
    )
