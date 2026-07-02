from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import PropertyType, ReferralSource, db_enum


class Client(IdMixin, TimestampMixin, Base):
    """A person we work for. Contact details only; the work hangs off their properties."""

    __tablename__ = "clients"

    name: Mapped[str] = mapped_column(String(200), index=True)
    phone: Mapped[str | None] = mapped_column(String(20))
    referral_source: Mapped[ReferralSource | None] = mapped_column(db_enum(ReferralSource, "referral_source"))
    notes: Mapped[str | None] = mapped_column(Text)

    properties: Mapped[list["Property"]] = relationship(back_populates="client")


class Property(IdMixin, TimestampMixin, Base):
    """One job: a flat, shop, plot or other site belonging to a client.

    Visits, charges and payments all belong to a property. Its status is derived from
    them, apart from closed_at, which records a manual close (for example a lost enquiry).
    """

    __tablename__ = "properties"

    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id", ondelete="RESTRICT"), index=True)
    label: Mapped[str] = mapped_column(String(200))
    property_type: Mapped[PropertyType] = mapped_column(db_enum(PropertyType, "property_type"))
    address: Mapped[str | None] = mapped_column(Text)
    drive_folder_url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    client: Mapped[Client] = relationship(back_populates="properties")
