from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import PaymentMethod, db_enum


class Payment(IdMixin, TimestampMixin, Base):
    """Money received against a property, in whole rupees. Each payment has its own receipt number,
    sequential within an Indian financial year (April to March). Payments are voided,
    never deleted, so receipt numbers never get reused."""

    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("fiscal_year", "receipt_seq"),
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("receipt_seq > 0", name="receipt_seq_positive"),
    )

    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="RESTRICT"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[PaymentMethod] = mapped_column(db_enum(PaymentMethod, "payment_method"))
    paid_on: Mapped[date] = mapped_column(Date, index=True)
    reference: Mapped[str | None] = mapped_column(String(300))
    fiscal_year: Mapped[str] = mapped_column(String(7))
    receipt_seq: Mapped[int] = mapped_column(Integer)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    void_reason: Mapped[str | None] = mapped_column(String(300))

    @property
    def receipt_no(self) -> str:
        return f"R/{self.fiscal_year}/{self.receipt_seq:04d}"
