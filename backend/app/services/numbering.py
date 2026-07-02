from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Payment


def fiscal_year(day: date) -> str:
    """Indian financial year label: 2026-04-01 to 2027-03-31 is '2026-27'."""
    start = day.year if day.month >= 4 else day.year - 1
    return f"{start}-{(start + 1) % 100:02d}"


def next_receipt_seq(session: Session, fy: str) -> int:
    current = session.scalar(select(func.max(Payment.receipt_seq)).where(Payment.fiscal_year == fy))
    return (current or 0) + 1
