
from typing import Any, List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
import tempfile
import subprocess
import json
from urllib.parse import quote
from app.api import deps
from app.models.service import ServiceEntry as ServiceModel
from app.models.payment import Payment as PaymentModel
from app.models.client import Client as ClientModel
from app.core.config import settings
from app.schemas.ledger import (
    ServiceEntry, ServiceEntryCreate, ServiceEntryUpdate,
    Payment, PaymentCreate, PaymentUpdate,
    ClientLedger, LedgerEntry
)

router = APIRouter()

@router.post("/services", response_model=ServiceEntry)
async def create_service_entry(
    *,
    db: AsyncSession = Depends(deps.get_db),
    entry_in: ServiceEntryCreate,
) -> Any:
    """
    Add a service charge to the ledger.
    """
    entry = ServiceModel(**entry_in.dict())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry

@router.put("/services/{id}", response_model=ServiceEntry)
async def update_service_entry(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
    entry_in: ServiceEntryUpdate,
) -> Any:
    """
    Update a service charge.
    """
    result = await db.execute(select(ServiceModel).where(ServiceModel.id == id))
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Service entry not found")
    
    update_data = entry_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(entry, field, update_data[field])
    
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry

@router.delete("/services/{id}", response_model=ServiceEntry)
async def delete_service_entry(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Delete a service charge.
    """
    result = await db.execute(select(ServiceModel).where(ServiceModel.id == id))
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Service entry not found")
    await db.delete(entry)
    await db.commit()
    return entry

@router.post("/payments", response_model=Payment)
async def create_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payment_in: PaymentCreate,
) -> Any:
    """
    Add a payment to the ledger.
    """
    payment = PaymentModel(**payment_in.dict())
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment

@router.put("/payments/{id}", response_model=Payment)
async def update_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
    payment_in: PaymentUpdate,
) -> Any:
    """
    Update a payment.
    """
    result = await db.execute(select(PaymentModel).where(PaymentModel.id == id))
    payment = result.scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = payment_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(payment, field, update_data[field])
    
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment

@router.delete("/payments/{id}", response_model=Payment)
async def delete_payment(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Delete a payment.
    """
    result = await db.execute(select(PaymentModel).where(PaymentModel.id == id))
    payment = result.scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await db.delete(payment)
    await db.commit()
    return payment

@router.get("/client/{client_id}", response_model=ClientLedger)
async def get_client_ledger(
    client_id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Get the full ledger history and current balance for a client.
    """
    # 1. Verify Client and get fixed fee
    result = await db.execute(select(ClientModel).where(ClientModel.id == client_id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # 2. Get all services
    s_result = await db.execute(select(ServiceModel).where(ServiceModel.client_id == client_id))
    services = s_result.scalars().all()

    # 3. Get all payments
    p_result = await db.execute(select(PaymentModel).where(PaymentModel.client_id == client_id))
    payments = p_result.scalars().all()

    # 4. Compile History
    history: List[LedgerEntry] = []
    
    # Add initial fixed fee as a charge
    total_billed = client.total_fees_fixed
    total_paid = 0.0
    
    # Start balance with fixed fee
    current_running_balance = total_billed
    
    history.append(LedgerEntry(
        id="initial-fee",
        type="charge",
        description="Initial Consultant Fee (Fixed)",
        amount=client.total_fees_fixed,
        date=client.created_at,
        balance_after=current_running_balance
    ))

    # Combine services and payments, sort by date
    all_events = []
    for s in services:
        all_events.append({"type": "charge", "id": s.id, "amount": s.amount, "desc": s.description, "date": s.date, "visit_id": s.visit_id})
        total_billed += s.amount
    
    for p in payments:
        all_events.append({"type": "payment", "id": p.id, "amount": p.amount, "desc": f"Payment via {p.method}", "date": p.date, "visit_id": None})
        total_paid += p.amount

    all_events.sort(key=lambda x: x["date"])

    for event in all_events:
        if event["type"] == "charge":
            current_running_balance += event["amount"]
        else:
            current_running_balance -= event["amount"]
            
        history.append(LedgerEntry(
            id=event["id"],
            type=event["type"],
            description=event["desc"],
            amount=event["amount"],
            date=event["date"],
            balance_after=current_running_balance,
            visit_id=event.get("visit_id")
        ))

    return ClientLedger(
        client_id=client_id,
        history=history,
        total_billed=total_billed,
        total_paid=total_paid,
        current_balance=current_running_balance
    )

@router.get("/client/{client_id}/bill")
async def download_client_bill(
    client_id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Generate and download a PDF bill for the client.
    """
    from fastapi.responses import StreamingResponse
    from app.utils.pdf import render_to_pdf
    from datetime import datetime

    # 1. Get Ledger Data (Reuse logic)
    ledger_data = await get_client_ledger(client_id, db)
    
    # 2. Get Client Data
    result = await db.execute(select(ClientModel).where(ClientModel.id == client_id))
    client = result.scalars().first()

    # 3. Prepare Context
    context = {
        "client": client,
        "ledger": ledger_data,
        "history": ledger_data.history,
        "date_generated": datetime.now().strftime("%d/%m/%Y"),
    }

    # 4. Render PDF
    pdf_file = render_to_pdf("bill.html", context)
    
    filename = f"Bill_{client.full_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_file,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
