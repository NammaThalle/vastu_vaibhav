
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
    Retrieve clients.
    """
    result = await db.execute(select(ClientModel).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=Client)
async def create_client(
    *,
    db: AsyncSession = Depends(deps.get_db),
    client_in: ClientCreate,
) -> Any:
    """
    Create new client.
    """
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
