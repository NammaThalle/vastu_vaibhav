from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import VisitStatus, db_enum


class Visit(IdMixin, TimestampMixin, Base):
    """A site visit. A visit with status 'scheduled' is an upcoming appointment."""

    __tablename__ = "visits"

    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="RESTRICT"), index=True)
    visit_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[VisitStatus] = mapped_column(db_enum(VisitStatus, "visit_status"), default=VisitStatus.DONE)
    purpose: Mapped[str | None] = mapped_column(String(200))
    observations: Mapped[str | None] = mapped_column(Text)
