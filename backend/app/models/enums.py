from enum import StrEnum

from sqlalchemy import Enum


def db_enum(enum_cls: type[StrEnum], name: str) -> Enum:
    """Store enum values as text with a CHECK constraint listing the allowed values."""
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=32,
        values_callable=lambda cls: [member.value for member in cls],
        validate_strings=True,
    )


class ReferralSource(StrEnum):
    BNI = "bni"
    BBB = "bbb"
    WORD_OF_MOUTH = "word_of_mouth"
    OTHER = "other"


class PropertyType(StrEnum):
    APARTMENT = "apartment"
    HOUSE = "house"
    SHOP = "shop"
    OFFICE = "office"
    FACTORY = "factory"
    PLOT = "plot"
    OTHER = "other"


class VisitStatus(StrEnum):
    SCHEDULED = "scheduled"
    DONE = "done"
    CANCELLED = "cancelled"


class ItemKind(StrEnum):
    REMEDY = "remedy"
    SERVICE = "service"


class ChargeKind(StrEnum):
    CHARGE = "charge"
    DISCOUNT = "discount"


class PaymentMethod(StrEnum):
    CASH = "cash"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CHEQUE = "cheque"
