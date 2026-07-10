from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.models.enums import ChargeKind, PaymentMethod, VisitStatus
from app.schemas.common import ORMModel, PositiveRupees, Rupees


class VoidRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=300)


# Visits

class VisitCreate(BaseModel):
    visit_date: date
    status: VisitStatus = VisitStatus.DONE
    purpose: str | None = Field(default=None, max_length=200)
    observations: str | None = None


class VisitUpdate(BaseModel):
    visit_date: date | None = None
    status: VisitStatus | None = None
    purpose: str | None = Field(default=None, max_length=200)
    observations: str | None = None


class VisitOut(ORMModel, VisitCreate):
    id: str
    property_id: str
    created_at: datetime


# Charges

class ChargeLine(BaseModel):
    """One line to add. Pick a catalog item, or type a description and price."""

    catalog_item_id: str | None = None
    description: str | None = Field(default=None, max_length=300)
    note: str | None = Field(default=None, max_length=200, description="Where it goes, e.g. shutter or main gate")
    quantity: int = Field(default=1, gt=0)
    unit_price: Rupees | None = Field(default=None, description="Defaults to the catalog price")
    kind: ChargeKind = ChargeKind.CHARGE

    @model_validator(mode="after")
    def needs_item_or_text(self):
        if self.catalog_item_id is None and (not self.description or self.unit_price is None):
            raise ValueError("Give a catalog item, or both a description and a unit price")
        return self


class ChargesCreate(BaseModel):
    charge_date: date
    visit_id: str | None = None
    lines: list[ChargeLine] = Field(min_length=1)


class ChargeUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=300)
    note: str | None = Field(default=None, max_length=200)
    quantity: int | None = Field(default=None, gt=0)
    unit_price: Rupees | None = None
    charge_date: date | None = None


class ChargeOut(ORMModel):
    id: str
    property_id: str
    visit_id: str | None
    catalog_item_id: str | None
    kind: ChargeKind
    description: str
    note: str | None
    quantity: int
    unit_price: int
    amount: int
    charge_date: date
    voided_at: datetime | None
    void_reason: str | None


# Payments

class PaymentCreate(BaseModel):
    amount: PositiveRupees
    method: PaymentMethod
    paid_on: date
    reference: str | None = Field(default=None, max_length=300)


class PaymentUpdate(BaseModel):
    amount: PositiveRupees | None = None
    method: PaymentMethod | None = None
    paid_on: date | None = None
    reference: str | None = Field(default=None, max_length=300)


class PaymentOut(ORMModel):
    id: str
    property_id: str
    amount: int
    method: PaymentMethod
    paid_on: date
    reference: str | None
    receipt_no: str
    voided_at: datetime | None
    void_reason: str | None
