
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


def build_invoice_payload(client: ClientModel, ledger_data: ClientLedger) -> dict[str, Any]:
    from datetime import datetime, timedelta

    now = datetime.now()
    charge_items = [
        {
            "title": entry.description,
            "description": entry.date.strftime("%d %b %Y") if entry.date else "",
            "amount": entry.amount,
        }
        for entry in ledger_data.history
        if entry.type == "charge" and entry.amount
    ]
    payment_entries = [entry for entry in ledger_data.history if entry.type == "payment"]

    return {
        "company": {
            "name": "VASTU VAIBHAV",
            "memberLabel": "BNI MEMBER",
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
            "taxRate": 0,
            "taxAmount": 0,
            "amountPaid": ledger_data.total_paid,
            "balanceAmount": ledger_data.current_balance,
        },
        "payment": {
            "bankName": "HDFC BANK",
            "accountNo": "ID030305089",
            "ifsc": "100000",
        },
        "contact": {
            "email": "vastuvaibhav.byravi@gmail.com",
            "phone": "+91 94201 97749",
            "secondaryPhone": "+91 86689 52446",
            "gpayPhone": "+91 94201 97749",
        },
    }

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

@router.get("/client/{client_id}/invoice-data")
async def get_client_invoice_data(
    client_id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    ledger_data = await get_client_ledger(client_id, db)
    result = await db.execute(select(ClientModel).where(ClientModel.id == client_id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return build_invoice_payload(client, ledger_data)

@router.get("/client/{client_id}/bill")
async def download_client_bill(
    client_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Generate and download a PDF bill for the client using the React invoice page and Puppeteer.
    """
    from fastapi.responses import FileResponse

    result = await db.execute(select(ClientModel).where(ClientModel.id == client_id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    ledger_data = await get_client_ledger(client_id, db)
    invoice_payload = build_invoice_payload(client, ledger_data)
    frontend_base_url = settings.FRONTEND_URL.rstrip("/")
    encoded_invoice = quote(json.dumps(invoice_payload, separators=(",", ":")))
    invoice_url = f"{frontend_base_url}/invoice/?data={encoded_invoice}"
    script_path = Path(__file__).resolve().parents[4] / "scripts" / "render_invoice_pdf.mjs"

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        pdf_path = Path(tmp.name)

    try:
        subprocess.run(
            ["node", str(script_path), invoice_url, str(pdf_path)],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        pdf_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail=f"Invoice PDF generation failed: {(exc.stderr or exc.stdout or '').strip()}",
        ) from exc

    filename = f"Bill_{client.full_name.replace(' ', '_')}_{client_id[:6]}.pdf"
    background_tasks.add_task(pdf_path.unlink, missing_ok=True)
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
    )
