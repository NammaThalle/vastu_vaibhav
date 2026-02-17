from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.models.client import Client as ClientModel
from app.schemas.client import Client, ClientCreate, ClientUpdate

router = APIRouter()

@router.get("/", response_model=List[Client])
async def read_clients(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve clients with computed balances.
    """
    stmt = select(ClientModel).options(
        selectinload(ClientModel.service_entries),
        selectinload(ClientModel.payments)
    ).offset(skip).limit(limit)
    result = await db.execute(stmt)
    clients_db = result.scalars().all()
    
    response_list = []
    for c in clients_db:
        total_billed = c.total_fees_fixed or 0.0
        for s in c.service_entries:
            total_billed += getattr(s, "amount", 0.0)
            
        total_paid = 0.0
        for p in c.payments:
            total_paid += getattr(p, "amount", 0.0)
            
        c.total_billed = total_billed
        c.current_balance = total_billed - total_paid
        response_list.append(c)
        
    return response_list

@router.post("/", response_model=Client)
async def create_client(
    *,
    db: AsyncSession = Depends(deps.get_db),
    client_in: ClientCreate,
) -> Any:
    client = ClientModel(**client_in.dict())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client

@router.put("/{id}", response_model=Client)
async def update_client(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
    client_in: ClientUpdate,
) -> Any:
    """
    Update a client.
    """
    result = await db.execute(select(ClientModel).where(ClientModel.id == id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(client, field, update_data[field])
    
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client

@router.get("/{id}", response_model=Client)
async def read_client(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Get client by ID.
    """
    result = await db.execute(select(ClientModel).where(ClientModel.id == id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.delete("/{id}", response_model=Client)
async def delete_client(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Delete a client.
    """
    result = await db.execute(select(ClientModel).where(ClientModel.id == id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
    return client

# --- CRM Specific Endpoints ---

from app.models.client_service import ClientService as ClientServiceModel
from app.schemas.client_service import ClientService, ClientServiceCreate
from sqlalchemy.orm import selectinload

@router.post("/{id}/services", response_model=ClientService)
async def add_service_to_client(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
    service_in: ClientServiceCreate,
) -> Any:
    """
    Attach a new service (from the catalog) to a specific client.
    """
    # Verify client exists
    result = await db.execute(select(ClientModel).where(ClientModel.id == id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    client_service = ClientServiceModel(**service_in.dict())
    client_service.client_id = id # Ensure safety
    db.add(client_service)
    
    # Update Client's total_fees_fixed for quick summary
    client.total_fees_fixed += service_in.calculated_fee
    
    await db.commit()
    await db.refresh(client_service)
    return client_service

@router.get("/{id}/history")
async def get_client_history(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Fetch comprehensive client history including all attached services, visits, and payments.
    """
    # Use selectinload to eagerly fetch related data
    stmt = (
        select(ClientModel)
        .where(ClientModel.id == id)
        .options(
            selectinload(ClientModel.services).selectinload(ClientServiceModel.service_catalog),
            selectinload(ClientModel.services).selectinload(ClientServiceModel.visits),
            selectinload(ClientModel.services).selectinload(ClientServiceModel.payments)
        )
    )
    result = await db.execute(stmt)
    client = result.scalars().first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    return client
