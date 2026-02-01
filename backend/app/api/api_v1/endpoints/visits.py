
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.models.visit import Visit as VisitModel
from app.schemas.visit import Visit, VisitCreate, VisitUpdate

router = APIRouter()

@router.get("/", response_model=List[Visit])
async def read_visits(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve visits.
    """
    result = await db.execute(select(VisitModel).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=Visit)
async def create_visit(
    *,
    db: AsyncSession = Depends(deps.get_db),
    visit_in: VisitCreate,
) -> Any:
    """
    Create new visit.
    """
    visit = VisitModel(**visit_in.dict())
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return visit

@router.put("/{id}", response_model=Visit)
async def update_visit(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
    visit_in: VisitUpdate,
) -> Any:
    """
    Update a visit.
    """
    result = await db.execute(select(VisitModel).where(VisitModel.id == id))
    visit = result.scalars().first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    update_data = visit_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(visit, field, update_data[field])
    
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return visit

@router.get("/{id}", response_model=Visit)
async def read_visit(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Get visit by ID.
    """
    result = await db.execute(select(VisitModel).where(VisitModel.id == id))
    visit = result.scalars().first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit

@router.delete("/{id}", response_model=Visit)
async def delete_visit(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Delete a visit.
    """
    result = await db.execute(select(VisitModel).where(VisitModel.id == id))
    visit = result.scalars().first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    await db.delete(visit)
    await db.commit()
    return visit
 