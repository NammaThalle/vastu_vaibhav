from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin
from app.db.types import Money
from app.models.enums import ChargeKind, db_enum


class Charge(IdMixin, TimestampMixin, Base):
    """One line on a property's bill: a charge, or a discount that reduces it.

    Description, quantity and unit price are copied at the time of entry and never
    follow later catalog changes. Lines are voided, never deleted.
    """

    __tablename__ = "charges"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
    )

    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="RESTRICT"), index=True)
    visit_id: Mapped[str | None] = mapped_column(ForeignKey("visits.id", ondelete="RESTRICT"), index=True)
    catalog_item_id: Mapped[str | None] = mapped_column(ForeignKey("catalog_items.id", ondelete="RESTRICT"))
    kind: Mapped[ChargeKind] = mapped_column(db_enum(ChargeKind, "charge_kind"), default=ChargeKind.CHARGE)
    description: Mapped[str] = mapped_column(String(300))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Money)
    charge_date: Mapped[date] = mapped_column(Date, index=True)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    void_reason: Mapped[str | None] = mapped_column(String(300))

    @property
    def amount(self) -> Decimal:
        return self.unit_price * self.quantity

    @property
    def signed_amount(self) -> Decimal:
        """Effect on the balance: positive for charges, negative for discounts."""
        return -self.amount if self.kind == ChargeKind.DISCOUNT else self.amount
