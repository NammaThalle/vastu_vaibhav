from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DB, get_or_404
from app.models import CatalogItem
from app.schemas.catalog import CatalogItemCreate, CatalogItemOut, CatalogItemUpdate

router = APIRouter()


@router.get("", response_model=list[CatalogItemOut])
async def list_catalog(db: DB, include_inactive: bool = False) -> list[CatalogItem]:
    query = select(CatalogItem).order_by(CatalogItem.kind, CatalogItem.name, CatalogItem.size_ml)
    if not include_inactive:
        query = query.where(CatalogItem.is_active.is_(True))
    return list(await db.scalars(query))


@router.post("", response_model=CatalogItemOut, status_code=201)
async def add_catalog_item(body: CatalogItemCreate, db: DB) -> CatalogItem:
    item = CatalogItem(**body.model_dump())
    db.add(item)
    try:
        await db.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="That item is already in the catalog")
    return item


@router.patch("/{item_id}", response_model=CatalogItemOut)
async def update_catalog_item(item_id: str, body: CatalogItemUpdate, db: DB) -> CatalogItem:
    """Price changes apply to new charges only; past bills keep the price they were sold at."""
    item = await get_or_404(db, CatalogItem, item_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item
