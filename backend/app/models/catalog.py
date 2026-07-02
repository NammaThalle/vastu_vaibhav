from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Integer, String, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin
from app.db.types import Money
from app.models.enums import ItemKind, db_enum


class CatalogItem(IdMixin, TimestampMixin, Base):
    """Something we sell: a remedy in a given bottle size, or a service.

    The price here is the current list price. Charges copy it when they are added,
    so changing a price never rewrites old bills.
    """

    __tablename__ = "catalog_items"
    __table_args__ = (
        UniqueConstraint("kind", "name", "size_ml"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
        CheckConstraint("size_ml IS NULL OR size_ml > 0", name="size_ml_positive"),
    )

    kind: Mapped[ItemKind] = mapped_column(db_enum(ItemKind, "item_kind"))
    name: Mapped[str] = mapped_column(String(200))
    size_ml: Mapped[int | None] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Money)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
