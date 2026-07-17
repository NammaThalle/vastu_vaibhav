"""Save read orders: create supplier products, lines and deliveries, and keep status current."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Supplier, SupplierDelivery, SupplierOrder, SupplierOrderLine, SupplierProduct
from app.models.enums import DeliveryKind, OrderLineKind, OrderSource, SupplierOrderStatus
from app.services.supplier.parse import ParsedOrder


class DuplicateOrder(ValueError):
    """The order, or one of its deliveries, is already saved (for example pasted earlier)."""


async def get_supplier(db: AsyncSession) -> Supplier:
    supplier = await db.scalar(select(Supplier).where(Supplier.name == settings.SUPPLIER_NAME))
    if supplier is None:
        supplier = Supplier(name=settings.SUPPLIER_NAME, base_url=settings.SUPPLIER_BASE_URL)
        db.add(supplier)
        await db.flush()
    return supplier


def status_of(parsed: ParsedOrder) -> tuple[SupplierOrderStatus, date | None]:
    """Received once every outgoing delivery has shipped; the latest shipping date counts."""
    if parsed.cancelled:
        return SupplierOrderStatus.CANCELLED, None
    outgoing = [d for d in parsed.deliveries if not d.is_return]
    if not outgoing:
        return SupplierOrderStatus.ON_THE_WAY, None
    if all(d.shipped for d in outgoing):
        days = [d.delivery_date for d in outgoing if d.delivery_date]
        return SupplierOrderStatus.RECEIVED, max(days) if days else parsed.order_date
    return SupplierOrderStatus.ON_THE_WAY, None


def review_note(parsed: ParsedOrder) -> str | None:
    returns = [d.number for d in parsed.deliveries if d.is_return]
    if returns:
        return (f"Has a return ({', '.join(returns)}). The order page does not say which items went back: "
                "correct the quantity of any line that was returned.")
    return None


async def _product(db: AsyncSession, supplier: Supplier, ref: str, name: str, size_ml: int | None) -> SupplierProduct:
    product = await db.scalar(select(SupplierProduct).where(
        SupplierProduct.supplier_id == supplier.id, SupplierProduct.external_ref == ref))
    if product is None:
        product = SupplierProduct(supplier_id=supplier.id, external_ref=ref, name=name, size_ml=size_ml,
                                  not_for_business=False)
        db.add(product)
        await db.flush()
    return product


async def _sync_deliveries(db: AsyncSession, supplier: Supplier, order: SupplierOrder, parsed: ParsedOrder) -> None:
    existing = {d.delivery_no: d for d in order.deliveries}
    for delivery in parsed.deliveries:
        row = existing.get(delivery.number)
        if row is None:
            other = await db.scalar(select(SupplierDelivery).where(
                SupplierDelivery.supplier_id == supplier.id, SupplierDelivery.delivery_no == delivery.number))
            if other is not None:
                continue  # already recorded on another order; save_order refuses that case for new orders
            row = SupplierDelivery(supplier_id=supplier.id, order_id=order.id, delivery_no=delivery.number,
                                   kind=DeliveryKind.RETURN if delivery.is_return else DeliveryKind.OUTGOING,
                                   status=delivery.status, delivery_date=delivery.delivery_date)
            db.add(row)
            order.deliveries.append(row)
        else:
            row.status, row.delivery_date = delivery.status, delivery.delivery_date


async def save_order(db: AsyncSession, parsed: ParsedOrder, source: OrderSource) -> tuple[SupplierOrder, bool]:
    """Create the order, or refresh the deliveries and status of one still on the way.
    Returns (order, created). Received and cancelled orders are never changed by a sync,
    so corrections made by hand stay."""
    supplier = await get_supplier(db)
    order = await db.scalar(select(SupplierOrder).where(
        SupplierOrder.supplier_id == supplier.id, SupplierOrder.reference == parsed.reference))

    if order is not None:
        if source != OrderSource.SYNC:
            raise DuplicateOrder(f"{parsed.reference} is already saved")
        if order.status == SupplierOrderStatus.ON_THE_WAY:
            await _sync_deliveries(db, supplier, order, parsed)
            order.status, order.received_on = status_of(parsed)
            order.needs_review = order.needs_review or review_note(parsed)
        return order, False

    numbers = [d.number for d in parsed.deliveries]
    if numbers:
        clash = await db.scalar(select(SupplierDelivery).where(
            SupplierDelivery.supplier_id == supplier.id, SupplierDelivery.delivery_no.in_(numbers)))
        if clash is not None:
            owner = await db.get(SupplierOrder, clash.order_id)
            raise DuplicateOrder(f"Delivery {clash.delivery_no} is already in {owner.reference}")

    status, received_on = status_of(parsed)
    if source == OrderSource.PASTE and status == SupplierOrderStatus.ON_THE_WAY and not parsed.deliveries:
        # A pasted order without delivery details: the user pastes what has arrived.
        status, received_on = SupplierOrderStatus.RECEIVED, parsed.order_date
    order = SupplierOrder(
        supplier_id=supplier.id, reference=parsed.reference, external_id=parsed.external_id,
        order_date=parsed.order_date, status=status, received_on=received_on, total=parsed.total,
        source=source, needs_review=review_note(parsed), lines=[], deliveries=[],
    )
    db.add(order)
    await db.flush()
    lines = []
    for position, line in enumerate(parsed.lines, start=1):
        if line.is_product:
            product = await _product(db, supplier, line.product_ref, line.description, line.size_ml)
            lines.append(SupplierOrderLine(order_id=order.id, position=position, kind=OrderLineKind.PRODUCT,
                                           supplier_product_id=product.id, description=line.description,
                                           quantity=line.quantity, unit_cost=line.unit_price))
        else:
            # Extras (delivery, wallet credit) keep their amount as one line.
            lines.append(SupplierOrderLine(order_id=order.id, position=position, kind=OrderLineKind.EXTRA,
                                           description=line.description, quantity=1, unit_cost=line.amount))
    order.lines.extend(lines)
    await _sync_deliveries(db, supplier, order, parsed)
    return order, True
