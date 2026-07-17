"""Stock and cost per remedy, derived from counts, supplier orders and bills. Nothing is stored.

stock = last count + bottles received since + added since - removed since - billed since

A count taken on a day includes everything dated that day, so only later events move it.
Without any count, stock starts at zero and can go negative: that is the prompt to count.
Cost is the average price paid across every received order line for the item.
"""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import CatalogItem, Charge, StockAdjustment, SupplierOrder, SupplierOrderLine, SupplierProduct
from app.models.enums import AdjustmentKind, ChargeKind, ItemKind, OrderLineKind, SupplierOrderStatus


def low_stock_level() -> int:
    return int(settings.APP_CONFIG.get("stock", {}).get("lowStockAt", 3))


@dataclass(frozen=True)
class StockLevel:
    catalog_item_id: str
    in_stock: int
    counted_on: date | None
    received: int        # since the last count (or ever, without a count)
    billed: int          # since the last count (or ever)
    avg_cost: int | None
    margin: int | None   # list price minus average cost
    low: bool


@dataclass(frozen=True)
class _Event:
    day: date
    order: int           # tie-breaker within a day for adjustments
    delta: int


async def stock_levels(db: AsyncSession) -> dict[str, StockLevel]:
    items = list(await db.scalars(select(CatalogItem).where(CatalogItem.kind == ItemKind.REMEDY)))
    ids = {item.id for item in items}

    counts: dict[str, StockAdjustment] = {}
    changes: dict[str, list[StockAdjustment]] = defaultdict(list)
    for adj in await db.scalars(select(StockAdjustment).order_by(StockAdjustment.adjusted_on, StockAdjustment.created_at)):
        if adj.kind == AdjustmentKind.COUNT:
            counts[adj.catalog_item_id] = adj   # the latest wins, given the ordering
        else:
            changes[adj.catalog_item_id].append(adj)

    received: dict[str, list[tuple[date, int]]] = defaultdict(list)
    cost_total: dict[str, int] = defaultdict(int)
    cost_qty: dict[str, int] = defaultdict(int)
    rows = await db.execute(
        select(SupplierOrderLine.quantity, SupplierOrderLine.unit_cost, SupplierProduct.catalog_item_id,
               SupplierOrder.received_on)
        .join(SupplierProduct, SupplierOrderLine.supplier_product_id == SupplierProduct.id)
        .join(SupplierOrder, SupplierOrderLine.order_id == SupplierOrder.id)
        .where(SupplierOrderLine.kind == OrderLineKind.PRODUCT, SupplierOrder.status == SupplierOrderStatus.RECEIVED,
               SupplierProduct.catalog_item_id.is_not(None)))
    for qty, unit_cost, item_id, received_on in rows:
        received[item_id].append((received_on, qty))
        cost_total[item_id] += qty * unit_cost
        cost_qty[item_id] += qty

    billed: dict[str, list[tuple[date, int]]] = defaultdict(list)
    for charge in await db.scalars(select(Charge).where(
            Charge.catalog_item_id.in_(ids), Charge.voided_at.is_(None), Charge.kind == ChargeKind.CHARGE)):
        billed[charge.catalog_item_id].append((charge.charge_date, charge.quantity))

    levels = {}
    threshold = low_stock_level()
    for item in items:
        count = counts.get(item.id)
        since = count.adjusted_on if count else None
        after = (lambda day: since is None or day > since)
        got = sum(q for day, q in received[item.id] if after(day))
        sold = sum(q for day, q in billed[item.id] if after(day))
        moved = 0
        for adj in changes[item.id]:
            later = count is None or (adj.adjusted_on, adj.created_at) > (count.adjusted_on, count.created_at)
            if later:
                moved += adj.quantity if adj.kind == AdjustmentKind.ADD else -adj.quantity
        in_stock = (count.quantity if count else 0) + got - sold + moved
        avg = round(cost_total[item.id] / cost_qty[item.id]) if cost_qty[item.id] else None
        levels[item.id] = StockLevel(
            catalog_item_id=item.id, in_stock=in_stock, counted_on=since, received=got, billed=sold,
            avg_cost=avg, margin=item.unit_price - avg if avg is not None else None,
            low=item.is_active and in_stock <= threshold,
        )
    return levels
