from datetime import date, datetime

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, false,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import (
    AdjustmentKind, DeliveryKind, OrderLineKind, OrderSource, SupplierOrderStatus, db_enum,
)


class Supplier(IdMixin, TimestampMixin, Base):
    """Where remedies are bought. One today (Grace Mystics); the tables allow more."""

    __tablename__ = "suppliers"

    name: Mapped[str] = mapped_column(String(200), unique=True)
    base_url: Mapped[str | None] = mapped_column(String(300))


class SupplierProduct(IdMixin, TimestampMixin, Base):
    """A product as the supplier sells it, remembered so it only has to be matched once.

    external_ref is the supplier's own product number (the digits at the end of its shop
    link), or the name when an order was pasted without links. A product is either matched
    to a catalog item or marked as not for business (bought for personal use); until one of
    the two is set, it waits on the matching screen and does not count as stock.
    """

    __tablename__ = "supplier_products"
    __table_args__ = (
        UniqueConstraint("supplier_id", "external_ref"),
        CheckConstraint("NOT (not_for_business AND catalog_item_id IS NOT NULL)", name="one_choice"),
    )

    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True)
    external_ref: Mapped[str] = mapped_column(String(200))
    name: Mapped[str] = mapped_column(String(300))
    size_ml: Mapped[int | None] = mapped_column(Integer)
    catalog_item_id: Mapped[str | None] = mapped_column(ForeignKey("catalog_items.id", ondelete="RESTRICT"))
    not_for_business: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    @property
    def matched(self) -> bool:
        return self.catalog_item_id is not None or self.not_for_business


class SupplierOrder(IdMixin, TimestampMixin, Base):
    """One order from a supplier: lines with what was paid, and the deliveries that brought it.

    reference is the supplier's order number (S08284) for synced orders, or the delivery
    number (WH/OUT/01261) for a pasted delivery. Lines count as stock from received_on,
    once the order is received. needs_review is set when something could not be read with
    certainty, for example a return whose quantities are not on the order page.
    """

    __tablename__ = "supplier_orders"
    __table_args__ = (
        UniqueConstraint("supplier_id", "reference"),
        CheckConstraint("status != 'received' OR received_on IS NOT NULL", name="received_has_date"),
    )

    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id", ondelete="RESTRICT"), index=True)
    reference: Mapped[str] = mapped_column(String(60))
    external_id: Mapped[str | None] = mapped_column(String(40))
    order_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[SupplierOrderStatus] = mapped_column(
        db_enum(SupplierOrderStatus, "supplier_order_status"), default=SupplierOrderStatus.ON_THE_WAY)
    received_on: Mapped[date | None] = mapped_column(Date)
    total: Mapped[int] = mapped_column(Integer)
    source: Mapped[OrderSource] = mapped_column(db_enum(OrderSource, "order_source"))
    needs_review: Mapped[str | None] = mapped_column(String(300))
    notes: Mapped[str | None] = mapped_column(Text)

    lines: Mapped[list["SupplierOrderLine"]] = relationship(order_by="SupplierOrderLine.position", lazy="selectin")
    deliveries: Mapped[list["SupplierDelivery"]] = relationship(order_by="SupplierDelivery.delivery_no", lazy="selectin")


class SupplierOrderLine(IdMixin, Base):
    """A line of a supplier order. Product lines point at the supplier product; the catalog
    item comes from that product's match, so matching a product once fixes every order."""

    __tablename__ = "supplier_order_lines"
    __table_args__ = (
        CheckConstraint(
            "(kind = 'product' AND supplier_product_id IS NOT NULL AND quantity >= 0 AND unit_cost >= 0)"
            " OR (kind = 'extra' AND supplier_product_id IS NULL)",
            name="product_or_extra",
        ),
    )

    order_id: Mapped[str] = mapped_column(ForeignKey("supplier_orders.id", ondelete="RESTRICT"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    kind: Mapped[OrderLineKind] = mapped_column(db_enum(OrderLineKind, "order_line_kind"))
    supplier_product_id: Mapped[str | None] = mapped_column(
        ForeignKey("supplier_products.id", ondelete="RESTRICT"), index=True)
    description: Mapped[str] = mapped_column(String(300))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[int] = mapped_column(Integer)

    supplier_product: Mapped[SupplierProduct | None] = relationship(lazy="selectin")

    @property
    def amount(self) -> int:
        return self.quantity * self.unit_cost


class SupplierDelivery(IdMixin, Base):
    """A delivery (WH/OUT) or return (WH/IN) listed on an order, with the supplier's status text."""

    __tablename__ = "supplier_deliveries"
    __table_args__ = (UniqueConstraint("supplier_id", "delivery_no"),)

    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id", ondelete="RESTRICT"))
    order_id: Mapped[str] = mapped_column(ForeignKey("supplier_orders.id", ondelete="RESTRICT"), index=True)
    delivery_no: Mapped[str] = mapped_column(String(60))
    kind: Mapped[DeliveryKind] = mapped_column(db_enum(DeliveryKind, "delivery_kind"))
    status: Mapped[str] = mapped_column(String(60))
    delivery_date: Mapped[date | None] = mapped_column(Date)


class StockAdjustment(IdMixin, TimestampMixin, Base):
    """A count of what is on the shelf, or a correction (a gift, a breakage, a sample)."""

    __tablename__ = "stock_adjustments"
    __table_args__ = (CheckConstraint("quantity >= 0", name="quantity_non_negative"),)

    catalog_item_id: Mapped[str] = mapped_column(ForeignKey("catalog_items.id", ondelete="RESTRICT"), index=True)
    kind: Mapped[AdjustmentKind] = mapped_column(db_enum(AdjustmentKind, "adjustment_kind"))
    quantity: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str | None] = mapped_column(String(300))
    adjusted_on: Mapped[date] = mapped_column(Date, index=True)


class SyncRun(IdMixin, Base):
    """One run of the supplier sync, for the status line and to stop two runs at once."""

    __tablename__ = "sync_runs"

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ok: Mapped[bool | None] = mapped_column(Boolean)
    message: Mapped[str | None] = mapped_column(Text)
    orders_added: Mapped[int] = mapped_column(Integer, default=0)
    orders_updated: Mapped[int] = mapped_column(Integer, default=0)
