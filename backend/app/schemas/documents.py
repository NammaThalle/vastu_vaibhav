from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.enums import ChargeKind
from app.schemas.common import ORMModel
from app.schemas.ledger import ChargeLine


class BillCreate(BaseModel):
    issued_on: date


class BillOut(ORMModel):
    id: str
    property_id: str
    bill_no: str
    issued_on: date
    total: int
    paid: int
    balance: int
    voided_at: datetime | None
    void_reason: str | None


class QuoteStatus(StrEnum):
    OPEN = "open"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class QuoteCreate(BaseModel):
    issued_on: date
    notes: str | None = None
    lines: list[ChargeLine] = Field(min_length=1)


class QuoteAccept(BaseModel):
    charge_date: date = Field(description="Date the accepted lines are added to the bill")


class QuoteLineOut(ORMModel):
    kind: ChargeKind
    description: str
    note: str | None
    quantity: int
    unit_price: int
    amount: int


class QuoteOut(ORMModel):
    id: str
    property_id: str
    quote_no: str
    issued_on: date
    notes: str | None
    total: int
    status: QuoteStatus
    accepted_at: datetime | None
    voided_at: datetime | None
    void_reason: str | None
    lines: list[QuoteLineOut]

    @classmethod
    def of(cls, quote) -> "QuoteOut":
        status = (QuoteStatus.ACCEPTED if quote.accepted_at else
                  QuoteStatus.DECLINED if quote.voided_at else QuoteStatus.OPEN)
        fields = ("id", "property_id", "quote_no", "issued_on", "notes", "total",
                  "accepted_at", "voided_at", "void_reason")
        return cls(**{f: getattr(quote, f) for f in fields}, status=status,
                   lines=[QuoteLineOut.model_validate(line) for line in quote.lines])
