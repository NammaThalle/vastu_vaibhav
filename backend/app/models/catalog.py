from sqlalchemy import Boolean, CheckConstraint, Integer, String, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import ItemKind, db_enum


class CatalogItem(IdMixin, TimestampMixin, Base):
    """Something we sell: a remedy in a 5ml or 15ml bottle, or a service.

    Prices are whole rupees. The price here is the current list price; charges copy it
    when they are added, so changing a price never rewrites old bills.
    """

    __tablename__ = "catalog_items"
    __table_args__ = (
        UniqueConstraint("kind", "name", "size_ml"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
        CheckConstraint(
            "(kind = 'remedy' AND COALESCE(size_ml, 0) IN (5, 15)) OR (kind = 'service' AND size_ml IS NULL)",
            name="size_ml_matches_kind",
        ),
    )

    kind: Mapped[ItemKind] = mapped_column(db_enum(ItemKind, "item_kind"))
    name: Mapped[str] = mapped_column(String(200))
    size_ml: Mapped[int | None] = mapped_column(Integer)
    unit_price: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
