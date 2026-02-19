
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.models.visit import Visit as VisitModel
from app.models.client import Client as ClientModel
from app.models.service_catalog import ServiceCatalog as CatalogModel
from app.models.service_addon import ServiceAddon as AddonModel
from app.models.service import ServiceEntry as LedgerModel
from app.schemas.visit import Visit, VisitCreate, VisitUpdate
from sqlalchemy import func

router = APIRouter()


def build_visit_charge_description(visit: VisitModel) -> str:
    purpose = (visit.purpose or "").strip()
    return f"Visit Charge: {purpose}" if purpose else "Visit Charge"


async def get_visit_charge_entry(db: AsyncSession, visit_id: str) -> LedgerModel | None:
    result = await db.execute(select(LedgerModel).where(LedgerModel.visit_id == visit_id))
    return result.scalars().first()


async def sync_visit_charge(db: AsyncSession, visit: VisitModel) -> None:
    existing_entry = await get_visit_charge_entry(db, visit.id)
    has_amount = visit.amount is not None and visit.amount > 0

    if not has_amount:
        if existing_entry:
            await db.delete(existing_entry)
        return

    charge_date = visit.date or visit.created_at
    description = build_visit_charge_description(visit)

    if existing_entry:
        existing_entry.amount = visit.amount
        existing_entry.date = charge_date
        existing_entry.description = description
        db.add(existing_entry)
        return

    db.add(
        LedgerModel(
            client_id=visit.client_id,
            visit_id=visit.id,
            description=description,
            amount=visit.amount,
            date=charge_date,
        )
    )

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
    Create new visit and calculate dynamic overdraft billing if applicable.
    """
    # 1. Fetch Client to determine their Service Type
    result = await db.execute(select(ClientModel).where(ClientModel.id == visit_in.client_id))
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    # 2. Add the physical Visit Record
    visit = VisitModel(**visit_in.dict())
    db.add(visit)
    await db.flush() # Secure the ID but don't commit fully yet
    
    # 3. Manual visit amount owns the visit-linked charge for this visit.
    if visit.amount is not None and visit.amount > 0:
        await sync_visit_charge(db, visit)
    # 4. Only fall back to supplementary auto-billing when no manual amount is provided.
    elif client.service_id:
        # A. Fetch the rules for their exact package
        res_cat = await db.execute(select(CatalogModel).where(CatalogModel.id == client.service_id))
        service_catalog = res_cat.scalars().first()
        
        if service_catalog:
            # B. Count their CURRENT visits (including the one we just flushed)
            count_res = await db.execute(select(func.count(VisitModel.id)).where(VisitModel.client_id == client.id))
            current_visit_count = count_res.scalar_one()
            
            # C. Check Threshold Limit
            if current_visit_count > service_catalog.max_free_visits:
                # D. Fetch the actual Addon pricing dynamically instead of hardcoding ₹500
                addon_res = await db.execute(
                    select(AddonModel)
                    .where(
                        (AddonModel.service_catalog_id == client.service_id) & 
                        (AddonModel.name == "Supplementary Site Visit")
                    )
                )
                visit_addon = addon_res.scalars().first()
                
                charge_amount = 500.0 # Fallback failsafe
                if visit_addon:
                    charge_amount = visit_addon.price
                
                # E. Inject Charge into Ledger
                visit.is_supplementary = True
                visit.fee_incurred = charge_amount
                db.add(
                    LedgerModel(
                        client_id=client.id,
                        visit_id=visit.id,
                        description=f"Auto-Billed: Supplementary Site Visit (#{current_visit_count})",
                        amount=charge_amount,
                        date=visit.date or visit.created_at,
                    )
                )

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
    previous_manual_amount = visit.amount
    previous_supplementary = bool(visit.is_supplementary)
    for field in update_data:
        setattr(visit, field, update_data[field])

    if visit.amount is not None and visit.amount > 0:
        visit.is_supplementary = False
        visit.fee_incurred = 0.0
        await sync_visit_charge(db, visit)
    else:
        if previous_manual_amount is not None and previous_manual_amount > 0:
            await sync_visit_charge(db, visit)
        elif previous_supplementary:
            linked_entry = await get_visit_charge_entry(db, visit.id)
            if linked_entry:
                linked_entry.date = visit.date or linked_entry.date
                db.add(linked_entry)

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
