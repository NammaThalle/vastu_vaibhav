from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin
from app.models.enums import ChargeKind, db_enum


class LineFields:
    """Columns shared by bill and quote lines: a copy of a charge, frozen when issued."""

    position: Mapped[int] = mapped_column(Integer)
    kind: Mapped[ChargeKind] = mapped_column(db_enum(ChargeKind, "charge_kind"), default=ChargeKind.CHARGE)
    description: Mapped[str] = mapped_column(String(300))
    note: Mapped[str | None] = mapped_column(String(200))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[int] = mapped_column(Integer)

    @property
    def amount(self) -> int:
        return self.unit_price * self.quantity

    @property
    def signed_amount(self) -> int:
        return -self.amount if self.kind == ChargeKind.DISCOUNT else self.amount


class Bill(IdMixin, TimestampMixin, Base):
    """A numbered bill for a property: a frozen copy of its charges on the day it was issued.

    Later edits to charges never change an issued bill; issue a new one instead. Bills are
    numbered per financial year (B/2026-27/0001) and cancelled, never deleted, so a number
    is never reused.
    """

    __tablename__ = "bills"
    __table_args__ = (
        UniqueConstraint("fiscal_year", "bill_seq"),
        CheckConstraint("bill_seq > 0", name="bill_seq_positive"),
        CheckConstraint("paid >= 0", name="paid_non_negative"),
    )

    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="RESTRICT"), index=True)
    issued_on: Mapped[date] = mapped_column(Date)
    fiscal_year: Mapped[str] = mapped_column(String(7))
    bill_seq: Mapped[int] = mapped_column(Integer)
    paid: Mapped[int] = mapped_column(Integer)  # payments received up to the issue date
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    void_reason: Mapped[str | None] = mapped_column(String(300))

    lines: Mapped[list["BillLine"]] = relationship(order_by="BillLine.position", lazy="selectin")

    @property
    def bill_no(self) -> str:
        return f"B/{self.fiscal_year}/{self.bill_seq:04d}"

    @property
    def total(self) -> int:
        return sum(line.signed_amount for line in self.lines)

    @property
    def balance(self) -> int:
        return self.total - self.paid


class BillLine(LineFields, IdMixin, Base):
    __tablename__ = "bill_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
    )

    bill_id: Mapped[str] = mapped_column(ForeignKey("bills.id", ondelete="RESTRICT"), index=True)
    charge_date: Mapped[date] = mapped_column(Date)


class Quote(IdMixin, TimestampMixin, Base):
    """A priced proposal for a property. Accepting it adds its lines to the bill as charges;
    declining it keeps it on record. Numbered per financial year (Q/2026-27/0001)."""

    __tablename__ = "quotes"
    __table_args__ = (
        UniqueConstraint("fiscal_year", "quote_seq"),
        CheckConstraint("quote_seq > 0", name="quote_seq_positive"),
        CheckConstraint("accepted_at IS NULL OR voided_at IS NULL", name="accepted_or_declined"),
    )

    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="RESTRICT"), index=True)
    issued_on: Mapped[date] = mapped_column(Date)
    fiscal_year: Mapped[str] = mapped_column(String(7))
    quote_seq: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    void_reason: Mapped[str | None] = mapped_column(String(300))

    lines: Mapped[list["QuoteLine"]] = relationship(order_by="QuoteLine.position", lazy="selectin")

    @property
    def quote_no(self) -> str:
        return f"Q/{self.fiscal_year}/{self.quote_seq:04d}"

    @property
    def total(self) -> int:
        return sum(line.signed_amount for line in self.lines)


class QuoteLine(LineFields, IdMixin, Base):
    __tablename__ = "quote_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
    )

    quote_id: Mapped[str] = mapped_column(ForeignKey("quotes.id", ondelete="RESTRICT"), index=True)
    catalog_item_id: Mapped[str | None] = mapped_column(ForeignKey("catalog_items.id", ondelete="RESTRICT"))
