from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import BigInteger
from sqlalchemy.types import TypeDecorator

PAISE = Decimal("0.01")


class Money(TypeDecorator):
    """Rupee amounts as Decimal in Python, stored as whole paise in an integer column.

    Integers are exact on SQLite, unlike NUMERIC which SQLite keeps as floating point.
    """

    impl = BigInteger
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return int((Decimal(str(value)).quantize(PAISE, rounding=ROUND_HALF_UP) * 100).to_integral_value())

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return (Decimal(value) / 100).quantize(PAISE)
