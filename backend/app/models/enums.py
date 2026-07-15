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


class SupplierOrderStatus(StrEnum):
    ON_THE_WAY = "on_the_way"   # ordered, not every delivery shipped yet
    RECEIVED = "received"       # every delivery shipped: the bottles count as stock
    CANCELLED = "cancelled"


class OrderSource(StrEnum):
    SYNC = "sync"
    PASTE = "paste"
    MANUAL = "manual"


class OrderLineKind(StrEnum):
    PRODUCT = "product"   # a supplier product, counted as stock once matched
    EXTRA = "extra"       # delivery charge, wallet credit and the like: money only


class DeliveryKind(StrEnum):
    OUTGOING = "outgoing"  # WH/OUT: goods sent to us
    RETURN = "return"      # WH/IN: goods sent back


class AdjustmentKind(StrEnum):
    COUNT = "count"     # sets the stock to an exact number on a date
    ADD = "add"
    REMOVE = "remove"
