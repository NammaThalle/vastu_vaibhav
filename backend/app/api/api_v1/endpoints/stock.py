"""Remedy stock, supplier orders, product matching and the supplier sync."""
import re
from collections import Counter

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select

from app.api.deps import DB, get_current_admin, get_or_404
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import (
    CatalogItem, StockAdjustment, SupplierOrder, SupplierOrderLine, SupplierProduct, SyncRun,
)
from app.models.enums import AdjustmentKind, ItemKind, OrderLineKind, OrderSource, SupplierOrderStatus
from app.schemas.stock import (
    OrderLineUpdate, PastedOrder, ProductMatch, StockAdjustmentCreate, StockCount, StockItem, StockOverview,
    SupplierDeliveryOut, SupplierOrderDetail, SupplierOrderLineOut, SupplierOrderSummary, SupplierOrderUpdate,
    SupplierProductOut, SyncStatus,
)
from app.services.stock import low_stock_level, stock_levels
from app.services.supplier.parse import OrderReadError, parse_pasted
from app.services.supplier.store import DuplicateOrder, save_order
from app.services.supplier.sync import SyncBusy, run_sync, start_run

router = APIRouter()


# Helpers

def _key(name: str) -> str:
    """Loose name for suggestions: 'Toilet Blocker 5ml' and 'Toilet Blocker' meet."""
    name = re.sub(r"\d+\s*ml\b", " ", name.lower())
    name = re.sub(r"\b(oil|remedy|bottle)\b", " ", name)
    return " ".join(re.sub(r"[^a-z0-9]+", " ", name).split())


async def _product_out(db: DB, products: list[SupplierProduct]) -> list[SupplierProductOut]:
    items = {i.id: i for i in await db.scalars(select(CatalogItem))}
    by_key = {(_key(i.name), i.size_ml): i.id for i in items.values() if i.kind == ItemKind.REMEDY and i.is_active}
    stats = {pid: (n, cost) for pid, n, cost in await db.execute(
        select(SupplierOrderLine.supplier_product_id, func.count(), func.max(SupplierOrderLine.unit_cost))
        .where(SupplierOrderLine.supplier_product_id.in_([p.id for p in products]))
        .group_by(SupplierOrderLine.supplier_product_id))}
    out = []
    for p in products:
        times, cost = stats.get(p.id, (0, None))
        out.append(SupplierProductOut.model_validate(p).model_copy(update={
            "catalog_item_name": items[p.catalog_item_id].name if p.catalog_item_id in items else None,
            "suggested_catalog_item_id": None if p.matched else by_key.get((_key(p.name), p.size_ml)),
            "times_ordered": times, "last_cost": cost,
        }))
    return out


def _summary(order: SupplierOrder, products: dict[str, SupplierProduct]) -> dict:
    product_lines = [line for line in order.lines if line.kind == OrderLineKind.PRODUCT]
    return dict(
        id=order.id, reference=order.reference, order_date=order.order_date, status=order.status,
        received_on=order.received_on, total=order.total, source=order.source, needs_review=order.needs_review,
        business_cost=sum(l.amount for l in product_lines if products[l.supplier_product_id].catalog_item_id),
        unmatched_lines=sum(1 for l in product_lines if not products[l.supplier_product_id].matched),
        line_count=len(order.lines),
    )


async def _products_by_id(db: DB) -> dict[str, SupplierProduct]:
    return {p.id: p for p in await db.scalars(select(SupplierProduct))}


async def _detail(db: DB, order: SupplierOrder) -> SupplierOrderDetail:
    products = await _products_by_id(db)
    used = [products[l.supplier_product_id] for l in order.lines if l.supplier_product_id]
    out = {p.id: p for p in await _product_out(db, list({p.id: p for p in used}.values()))}
    return SupplierOrderDetail(
        **_summary(order, products), notes=order.notes,
        lines=[SupplierOrderLineOut(id=l.id, kind=l.kind, description=l.description, quantity=l.quantity,
                                    unit_cost=l.unit_cost, amount=l.amount,
                                    product=out.get(l.supplier_product_id)) for l in order.lines],
        deliveries=[SupplierDeliveryOut.model_validate(d) for d in order.deliveries],
    )


async def _sync_status(db: DB) -> SyncStatus:
    last = await db.scalar(select(SyncRun).order_by(SyncRun.started_at.desc()))
    return SyncStatus(
        enabled=settings.supplier_sync_enabled,
        running=bool(last and last.finished_at is None),
        last_run_at=last.started_at if last else None,
        last_ok=last.ok if last else None,
        last_message=last.message if last else None,
    )


# Stock

@router.get("/stock", response_model=StockOverview)
async def stock_overview(db: DB) -> StockOverview:
    levels = await stock_levels(db)
    items = list(await db.scalars(select(CatalogItem).where(CatalogItem.kind == ItemKind.REMEDY)
                                  .order_by(CatalogItem.name, CatalogItem.size_ml)))
    products = await _products_by_id(db)
    to_match = {l.supplier_product_id for l in await db.scalars(
        select(SupplierOrderLine).where(SupplierOrderLine.kind == OrderLineKind.PRODUCT))
        if not products[l.supplier_product_id].matched}
    to_review = await db.scalar(select(func.count()).select_from(SupplierOrder).where(
        SupplierOrder.needs_review.is_not(None), SupplierOrder.status != SupplierOrderStatus.CANCELLED))
    return StockOverview(
        items=[StockItem(name=i.name, size_ml=i.size_ml, unit_price=i.unit_price, is_active=i.is_active,
                         **{k: v for k, v in levels[i.id].__dict__.items()}) for i in items],
        low_stock_at=low_stock_level(), products_to_match=len(to_match), orders_to_review=to_review or 0,
        sync=await _sync_status(db),
    )


@router.post("/stock/counts", status_code=201)
async def record_count(body: StockCount, db: DB) -> dict:
    """Set the stock of each listed remedy to what is on the shelf on that day."""
    for line in body.counts:
        item = await get_or_404(db, CatalogItem, line.catalog_item_id)
        if item.kind != ItemKind.REMEDY:
            raise HTTPException(status_code=400, detail=f"{item.name} is a service; only remedies are stocked")
        db.add(StockAdjustment(catalog_item_id=item.id, kind=AdjustmentKind.COUNT, quantity=line.quantity,
                               reason="Stock count", adjusted_on=body.adjusted_on))
    await db.commit()
    return {"counted": len(body.counts)}


@router.post("/stock/adjustments", status_code=201)
async def adjust_stock(body: StockAdjustmentCreate, db: DB) -> dict:
    item = await get_or_404(db, CatalogItem, body.catalog_item_id)
    if item.kind != ItemKind.REMEDY:
        raise HTTPException(status_code=400, detail="Only remedies are stocked")
    db.add(StockAdjustment(catalog_item_id=item.id, kind=AdjustmentKind(body.kind), quantity=body.quantity,
                           reason=body.reason, adjusted_on=body.adjusted_on))
    await db.commit()
    return {"ok": True}


# Supplier orders

@router.get("/supplier/orders", response_model=list[SupplierOrderSummary])
async def list_orders(db: DB) -> list[SupplierOrderSummary]:
    products = await _products_by_id(db)
    orders = await db.scalars(select(SupplierOrder).order_by(SupplierOrder.order_date.desc(), SupplierOrder.reference.desc()))
    return [SupplierOrderSummary(**_summary(o, products)) for o in orders]


@router.get("/supplier/orders/{order_id}", response_model=SupplierOrderDetail)
async def get_order(order_id: str, db: DB) -> SupplierOrderDetail:
    return await _detail(db, await get_or_404(db, SupplierOrder, order_id))


@router.post("/supplier/orders/paste", response_model=SupplierOrderDetail, status_code=201)
async def paste_order(body: PastedOrder, db: DB) -> SupplierOrderDetail:
    """Save an order copied from the supplier's site. New products then wait for matching."""
    try:
        order, _ = await save_order(db, parse_pasted(body.text), OrderSource.PASTE)
    except (OrderReadError, DuplicateOrder) as error:
        raise HTTPException(status_code=400, detail=str(error))
    await db.commit()
    return await _detail(db, await get_or_404(db, SupplierOrder, order.id))


@router.patch("/supplier/orders/{order_id}", response_model=SupplierOrderDetail)
async def update_order(order_id: str, body: SupplierOrderUpdate, db: DB) -> SupplierOrderDetail:
    order = await get_or_404(db, SupplierOrder, order_id)
    data = body.model_dump(exclude_unset=True)
    if data.pop("review_done", False):
        order.needs_review = None
    for field, value in data.items():
        setattr(order, field, value)
    if order.status == SupplierOrderStatus.RECEIVED and order.received_on is None:
        order.received_on = order.order_date
    if order.status != SupplierOrderStatus.RECEIVED:
        order.received_on = None
    await db.commit()
    return await _detail(db, await get_or_404(db, SupplierOrder, order.id))


@router.patch("/supplier/order-lines/{line_id}", response_model=SupplierOrderDetail)
async def update_line(line_id: str, body: OrderLineUpdate, db: DB) -> SupplierOrderDetail:
    line = await get_or_404(db, SupplierOrderLine, line_id)
    if line.kind != OrderLineKind.PRODUCT:
        raise HTTPException(status_code=400, detail="Only product lines have a quantity to correct")
    line.quantity = body.quantity
    await db.commit()
    return await _detail(db, await get_or_404(db, SupplierOrder, line.order_id))


# Supplier products

@router.get("/supplier/products", response_model=list[SupplierProductOut])
async def list_products(db: DB, unmatched_only: bool = False) -> list[SupplierProductOut]:
    products = list(await db.scalars(select(SupplierProduct).order_by(SupplierProduct.name)))
    if unmatched_only:
        products = [p for p in products if not p.matched]
    return await _product_out(db, products)


@router.post("/supplier/products/{product_id}/match", response_model=SupplierProductOut)
async def match_product(product_id: str, body: ProductMatch, db: DB) -> SupplierProductOut:
    """Remember what a supplier product is. Applies to every order, past and future."""
    product = await get_or_404(db, SupplierProduct, product_id)
    product.catalog_item_id, product.not_for_business = None, body.not_for_business
    if body.catalog_item_id:
        item = await get_or_404(db, CatalogItem, body.catalog_item_id)
        if item.kind != ItemKind.REMEDY:
            raise HTTPException(status_code=400, detail="Supplier products can only match remedies")
        product.catalog_item_id = item.id
    elif body.new_item:
        name = body.new_item.name.strip()
        same = await db.scalar(select(CatalogItem).where(
            CatalogItem.kind == ItemKind.REMEDY, func.lower(CatalogItem.name) == name.lower(),
            CatalogItem.size_ml.is_(None) if body.new_item.size_ml is None else CatalogItem.size_ml == body.new_item.size_ml))
        if same is not None:
            raise HTTPException(status_code=409, detail=f"{name} is already in the catalog; pick it from the list")
        item = CatalogItem(kind=ItemKind.REMEDY, name=name, size_ml=body.new_item.size_ml,
                           unit_price=body.new_item.unit_price, is_active=True)
        db.add(item)
        await db.flush()
        product.catalog_item_id = item.id
    await db.commit()
    return (await _product_out(db, [product]))[0]


# Sync

async def _sync_in_background(run_id: str) -> None:
    async with AsyncSessionLocal() as db:
        run = await db.get(SyncRun, run_id)
        await run_sync(db, run)


@router.post("/supplier/sync", response_model=SyncStatus, status_code=202,
             dependencies=[Depends(get_current_admin)])
async def sync_now(background: BackgroundTasks, db: DB) -> SyncStatus:
    if not settings.supplier_sync_enabled:
        raise HTTPException(status_code=400, detail="No supplier login is set on the server")
    try:
        run = await start_run(db)
    except SyncBusy as error:
        raise HTTPException(status_code=409, detail=str(error))
    background.add_task(_sync_in_background, run.id)
    return await _sync_status(db)
