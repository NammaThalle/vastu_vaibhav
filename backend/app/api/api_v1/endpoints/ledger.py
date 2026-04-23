
from typing import Any
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
import asyncio
import tempfile
import subprocess
import json
import re
from urllib.parse import quote
from app.api import deps
from app.models.service import ServiceEntry as ServiceModel
from app.models.payment import Payment as PaymentModel
from app.models.client import Client as ClientModel
from app.core.config import settings
from app.schemas.ledger import (
    ServiceEntry, ServiceEntryCreate, ServiceEntryUpdate,
    Payment, PaymentCreate, PaymentUpdate,
    ClientLedger
)
from app.services.ledger_service import build_invoice_payload, calculate_client_ledger
from app.utils.logger import logger

router = APIRouter()


def sanitize_bill_filename(value: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", value).strip("_")
    return safe_name or "Client"

@router.post("/services", response_model=ServiceEntry)
async def create_service_entry(
    *,
    db: AsyncSession = Depends(deps.get_db),
    entry_in: ServiceEntryCreate,
) -> Any:
    """
    Add a service charge to the ledger.
    """
    logger.info("Adding service: %s (₹%s)", entry_in.client_id[:6], entry_in.amount)
    entry = ServiceModel(**entry_in.dict())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("Service entry created successfully: %s", entry.id[:6])
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
    logger.info("Creating payment entry: %s (₹%s)", payment_in.client_id[:6], payment_in.amount)
    payment = PaymentModel(**payment_in.dict())
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    logger.info("Payment logged succesfully: %s", payment.id[:6])
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
    logger.debug("Fetching ledger: %s", client_id[:6])
    return await calculate_client_ledger(db, client_id)

@router.get("/client/{client_id}/invoice-data")
async def get_client_invoice_data(
    client_id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    ledger_data = await calculate_client_ledger(db, client_id)
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

    filename = f"Bill_{sanitize_bill_filename(client.full_name)}_{client_id[:6]}.pdf"
    logger.info("Generating invoice: %s", client.full_name)
    
    # Generate the payload
    ledger_data = await calculate_client_ledger(db, client_id)
    invoice_payload = build_invoice_payload(client, ledger_data)
    
    frontend_base_url = settings.FRONTEND_URL.rstrip("/")
    encoded_invoice = quote(json.dumps(invoice_payload, separators=(",", ":")))
    invoice_url = f"{frontend_base_url}/invoice/?data={encoded_invoice}"
    script_path = Path(__file__).resolve().parents[4] / "scripts" / "render_invoice_pdf.mjs"

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        pdf_path = Path(tmp.name)

    try:
        logger.debug("Executing Puppeteer script at %s", script_path)
        proc = await asyncio.create_subprocess_exec(
            "node", str(script_path), invoice_url, str(pdf_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error("Puppeteer PDF generation failed: %s", stderr.decode())
            raise subprocess.CalledProcessError(
                proc.returncode, "node",
                output=stdout.decode(),
                stderr=stderr.decode(),
            )
        logger.info("Invoice generated successfully: %s", filename)
    except subprocess.CalledProcessError as exc:
        pdf_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail=f"Invoice PDF generation failed: {(exc.stderr or exc.output or '').strip()}",
        ) from exc

    background_tasks.add_task(pdf_path.unlink, missing_ok=True)
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
    )
