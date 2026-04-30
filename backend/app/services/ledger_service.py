from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.client import Client as ClientModel
from app.models.payment import Payment as PaymentModel
from app.models.service import ServiceEntry as ServiceModel
from app.schemas.ledger import ClientLedger, LedgerEntry


MONEY_QUANT = Decimal("0.01")


def _money(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def _as_float(value: Decimal) -> float:
    return float(value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP))


def _service_entry_type(service: ServiceModel) -> str:
    return getattr(service, "entry_type", None) or "charge"


def apply_loaded_client_balances(client: ClientModel) -> ClientModel:
    total_billed = _money(client.total_fees_fixed)
    total_paid = Decimal("0.00")

    for service in getattr(client, "service_entries", []) or []:
        amount = _money(service.amount)
        if _service_entry_type(service) == "discount":
            total_billed -= amount
        else:
            total_billed += amount

    for payment in getattr(client, "payments", []) or []:
        total_paid += _money(payment.amount)

    client.total_billed = _as_float(total_billed)
    client.current_balance = _as_float(total_billed - total_paid)
    return client


async def get_client_or_404(db: AsyncSession, client_id: str) -> ClientModel:
    result = await db.execute(select(ClientModel).where(ClientModel.id == client_id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


def _event_sort_key(event: dict[str, Any]) -> datetime:
    return event["date"] or datetime.min


async def calculate_client_ledger(db: AsyncSession, client_id: str) -> ClientLedger:
    client = await get_client_or_404(db, client_id)

    services_result = await db.execute(select(ServiceModel).where(ServiceModel.client_id == client_id))
    services = services_result.scalars().all()

    payments_result = await db.execute(select(PaymentModel).where(PaymentModel.client_id == client_id))
    payments = payments_result.scalars().all()

    fixed_fee = _money(client.total_fees_fixed)
    total_billed = fixed_fee
    total_paid = Decimal("0.00")
    running_balance = fixed_fee

    history: list[LedgerEntry] = [
        LedgerEntry(
            id="initial-fee",
            type="charge",
            description="Initial Consultant Fee (Fixed)",
            amount=_as_float(fixed_fee),
            date=client.created_at or datetime.now(),
            balance_after=_as_float(running_balance),
        )
    ]

    events: list[dict[str, Any]] = []
    for service in services:
        amount = _money(service.amount)
        entry_type = _service_entry_type(service)
        events.append(
            {
                "type": entry_type,
                "id": service.id,
                "amount": amount,
                "description": service.description,
                "date": service.date,
                "visit_id": service.visit_id,
            }
        )
        if entry_type == "discount":
            total_billed -= amount
        else:
            total_billed += amount

    for payment in payments:
        amount = _money(payment.amount)
        events.append(
            {
                "type": "payment",
                "id": payment.id,
                "amount": amount,
                "description": f"Payment via {payment.method or 'Unknown'}",
                "date": payment.date,
                "visit_id": None,
            }
        )
        total_paid += amount

    for event in sorted(events, key=_event_sort_key):
        if event["type"] == "charge":
            running_balance += event["amount"]
        else:
            running_balance -= event["amount"]

        history.append(
            LedgerEntry(
                id=event["id"],
                type=event["type"],
                description=event["description"],
                amount=_as_float(event["amount"]),
                date=event["date"] or datetime.now(),
                balance_after=_as_float(running_balance),
                visit_id=event["visit_id"],
            )
        )

    return ClientLedger(
        client_id=client_id,
        history=history,
        total_billed=_as_float(total_billed),
        total_paid=_as_float(total_paid),
        current_balance=_as_float(running_balance),
    )


def build_invoice_payload(client: ClientModel, ledger_data: ClientLedger) -> dict[str, Any]:
    now = datetime.now()
    charge_items = [
        {
            "title": entry.description,
            "description": entry.date.strftime("%d %b %Y") if entry.date else "",
            "amount": -entry.amount if entry.type == "discount" else entry.amount,
        }
        for entry in ledger_data.history
        if entry.type in {"charge", "discount"} and entry.amount
    ]

    app_cfg = settings.APP_CONFIG
    tax_rate = _as_float(_money(app_cfg.get("payment", {}).get("taxRate", 0)))
    tax_amount = 0.0

    return {
        "company": {
            "name": app_cfg.get("project", {}).get("name", "VASTU VAIBHAV"),
            "memberLabel": app_cfg.get("invoice", {}).get("memberLabel", "BNI MEMBER"),
        },
        "meta": {
            "invoiceNo": f"VV-{client.id[:6].upper()}-{now.strftime('%Y%m%d')}",
            "date": now.strftime("%d %b %Y"),
            "dueDate": (now + timedelta(days=15)).strftime("%d %b %Y"),
        },
        "customer": {
            "name": client.full_name,
            "address": client.personal_address or "",
            "phone": client.phone or "",
            "projectAddress": client.project_address or "",
        },
        "items": charge_items,
        "summary": {
            "subtotal": ledger_data.total_billed,
            "taxRate": tax_rate,
            "taxAmount": tax_amount,
            "amountPaid": ledger_data.total_paid,
            "balanceAmount": ledger_data.current_balance,
        },
        "payment": {
            "bankName": app_cfg.get("payment", {}).get("bankName", "HDFC BANK"),
            "accountNo": app_cfg.get("payment", {}).get("accountNo", "ID030305089"),
            "ifsc": app_cfg.get("payment", {}).get("ifsc", "100000"),
        },
        "contact": {
            "email": app_cfg.get("contact", {}).get("email", ""),
            "phone": app_cfg.get("contact", {}).get("phone", ""),
            "secondaryPhone": app_cfg.get("contact", {}).get("secondaryPhone", ""),
            "gpayPhone": app_cfg.get("contact", {}).get("gpayPhone", ""),
        },
    }
