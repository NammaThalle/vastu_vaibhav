from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.models.service_catalog import ServiceCatalog as ServiceCatalogModel
from app.schemas.service_catalog import ServiceCatalog, ServiceCatalogCreate, ServiceCatalogUpdate, ServiceCatalogWithAddons
from app.models.service_addon import ServiceAddon as ServiceAddonModel
from app.schemas.service_addon import ServiceAddon, ServiceAddonCreate, ServiceAddonUpdate
from pydantic import BaseModel
import json

router = APIRouter()

@router.get("/catalog", response_model=List[ServiceCatalogWithAddons])
async def read_service_catalog(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all available services from the catalog.
    """
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ServiceCatalogModel)
        .options(selectinload(ServiceCatalogModel.addons))
        .where(ServiceCatalogModel.is_active == True)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.get("/catalog/{id}", response_model=ServiceCatalogWithAddons)
async def read_service_catalog_item(
    id: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Retrieve a specific service catalog item and its configured addons.
    """
    # Eager load addons or just query normally? Let's use selectinload
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ServiceCatalogModel)
        .options(selectinload(ServiceCatalogModel.addons))
        .where(ServiceCatalogModel.id == id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Service Catalog not found")
    return item

@router.post("/catalog", response_model=ServiceCatalog)
async def create_service_catalog(
    *,
    db: AsyncSession = Depends(deps.get_db),
    catalog_in: ServiceCatalogCreate,
) -> Any:
    """
    Create a new service in the catalog (Admin only).
    """
    catalog_item = ServiceCatalogModel(**catalog_in.dict())
    db.add(catalog_item)
    await db.commit()
    await db.refresh(catalog_item)
    return catalog_item

@router.put("/catalog/{id}", response_model=ServiceCatalog)
async def update_service_catalog(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
    catalog_in: ServiceCatalogUpdate,
) -> Any:
    """
    Update a service in the catalog (Admin only).
    """
    result = await db.execute(select(ServiceCatalogModel).where(ServiceCatalogModel.id == id))
    catalog_item = result.scalars().first()
    if not catalog_item:
        raise HTTPException(status_code=404, detail="Service Catalog not found")
    
    update_data = catalog_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(catalog_item, field, value)
        
    db.add(catalog_item)
    await db.commit()
    await db.refresh(catalog_item)
    return catalog_item

@router.delete("/catalog/{id}")
async def delete_service_catalog(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Soft delete a service from the catalog (Admin only).
    """
    result = await db.execute(select(ServiceCatalogModel).where(ServiceCatalogModel.id == id))
    catalog_item = result.scalars().first()
    if not catalog_item:
        raise HTTPException(status_code=404, detail="Service Catalog not found")
    
    catalog_item.is_active = False
    db.add(catalog_item)
    await db.commit()
    return {"message": "Service successfully deleted/deactivated"}

# --- Addon Management ---

@router.post("/catalog/{catalog_id}/addons", response_model=ServiceAddon)
async def create_service_addon(
    *,
    db: AsyncSession = Depends(deps.get_db),
    catalog_id: str,
    addon_in: ServiceAddonCreate,
) -> Any:
    """
    Create a new sub-charge addon for a specific service.
    """
    result = await db.execute(select(ServiceCatalogModel).where(ServiceCatalogModel.id == catalog_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Parent Service Catalog not found")

    addon_item = ServiceAddonModel(**addon_in.dict(), service_catalog_id=catalog_id)
    db.add(addon_item)
    await db.commit()
    await db.refresh(addon_item)
    return addon_item

@router.put("/addons/{id}", response_model=ServiceAddon)
async def update_service_addon(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
    addon_in: ServiceAddonUpdate,
) -> Any:
    """
    Update a specific addon's name or price.
    """
    result = await db.execute(select(ServiceAddonModel).where(ServiceAddonModel.id == id))
    addon_item = result.scalars().first()
    if not addon_item:
        raise HTTPException(status_code=404, detail="Service Addon not found")
    
    update_data = addon_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(addon_item, field, value)
        
    db.add(addon_item)
    await db.commit()
    await db.refresh(addon_item)
    return addon_item

@router.delete("/addons/{id}")
async def delete_service_addon(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: str,
) -> Any:
    """
    Delete a specific addon.
    """
    result = await db.execute(select(ServiceAddonModel).where(ServiceAddonModel.id == id))
    addon_item = result.scalars().first()
    if not addon_item:
        raise HTTPException(status_code=404, detail="Service Addon not found")
    
    await db.delete(addon_item)
    await db.commit()
    return {"message": "Addon successfully deleted"}

# --- Dynamic Calculator Models ---
class CalculateRequest(BaseModel):
    service_id: str
    property_type: str = "Residential" # Residential, Commercial, Agricultural, Industrial
    num_rooms: int = 0
    num_remedies: int = 0
    interior_items: int = 0
    exterior_items: int = 0
    full_interior: bool = False
    full_exterior: bool = False
    extra_visits: int = 0
    bundle_type: str = "None" # Pre-Construction, Post-Construction, Complete Vastu, Custom
    custom_bundle_price: float = 0.0

class CalculateResponse(BaseModel):
    estimated_total: float
    breakdown: dict

@router.post("/calculate", response_model=CalculateResponse)
async def calculate_estimate(
    request: CalculateRequest,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Dynamically calculate the estimated fee based on Services.md rules.
    """
    # 1. Fetch the base service to know its logic
    # (In a real app, logic might be hardcoded per service ID or name)
    result = await db.execute(select(ServiceCatalogModel).where(ServiceCatalogModel.id == request.service_id))
    service = result.scalars().first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found in catalog")

    total = 0.0
    breakdown = {}
    
    name = service.name.lower()
    
    # Logic matching Services.md Rules
    if "plot selection" in name:
        if request.property_type == "Residential":
            total += 3000
            breakdown["Base (Residential)"] = 3000
        elif request.property_type in ["Commercial", "Agricultural"]:
            total += 5000
            breakdown[f"Base ({request.property_type})"] = 5000
        elif request.property_type == "Industrial":
            total += 10000
            breakdown["Base (Industrial)"] = 10000
            
    elif "new plan study" in name or "house vastu analysis" in name:
        total += 2500
        breakdown["Base Fee"] = 2500
        
    elif "plan modification" in name or "remedial" in name:
        rooms_cost = request.num_rooms * 1500
        remedies_cost = request.num_remedies * 500
        total += (rooms_cost + remedies_cost)
        if rooms_cost: breakdown[f"{request.num_rooms} Rooms"] = rooms_cost
        if remedies_cost: breakdown[f"{request.num_remedies} Remedies"] = remedies_cost
        
    elif "interior & exterior" in name:
        if request.full_interior and request.full_exterior:
            total += 5000
            breakdown["Full Property Package"] = 5000
        elif request.full_interior:
            total += 2500
            breakdown["Comprehensive Interior"] = 2500
        elif request.full_exterior:
            total += 2500
            breakdown["Comprehensive Exterior"] = 2500
        else:
            items_cost = (request.interior_items + request.exterior_items) * 500
            total += items_cost
            if items_cost: breakdown["Individual Items"] = items_cost
            
    elif "bundle" in name:
        if request.bundle_type == "Pre-Construction":
            # Plot Selection + New Plan Study
            plot_base = 3000 if request.property_type == "Residential" else (5000 if request.property_type in ["Commercial", "Agricultural"] else 10000)
            total += (plot_base + 2500)
            breakdown["Pre-Construction Bundle Estimate"] = total
        elif request.bundle_type == "Post-Construction":
            # Just an estimate (1 room, 1 remedy + interior)
            total += (1500 + 500 + 5000)
            breakdown["Post-Construction Bundle Estimate (Base)"] = total
        elif request.bundle_type == "Complete Vastu":
            plot_base = 3000 if request.property_type == "Residential" else (5000 if request.property_type in ["Commercial", "Agricultural"] else 10000)
            total += (plot_base + 2500 + 5000)
            breakdown["Complete Vastu Bundle Estimate"] = total
        elif request.bundle_type == "Custom":
            total += request.custom_bundle_price
            breakdown["Negotiated Custom Bundle"] = total

    # Add extra visits
    if request.extra_visits > 0:
        visits_cost = request.extra_visits * 500
        total += visits_cost
        breakdown[f"{request.extra_visits} Extra Visits"] = visits_cost
        
    return CalculateResponse(estimated_total=total, breakdown=breakdown)
