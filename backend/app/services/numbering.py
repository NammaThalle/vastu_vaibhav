from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Payment


def fiscal_year(day: date) -> str:
    """Indian financial year label: 2026-04-01 to 2027-03-31 is '2026-27'."""
    start = day.year if day.month >= 4 else day.year - 1
    return f"{start}-{(start + 1) % 100:02d}"


async def next_receipt_seq(session: AsyncSession, fy: str) -> int:
    """Next receipt number in a financial year. Voided payments keep their number, so
    numbers are never reused. SQLite runs one write at a time, and the unique
    constraint on (fiscal_year, receipt_seq) guards against any race."""
    current = await session.scalar(select(func.max(Payment.receipt_seq)).where(Payment.fiscal_year == fy))
    return (current or 0) + 1
