from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import PropertyType, ReferralSource
from app.schemas.common import ORMModel, ShortText, Summary
from app.schemas.documents import BillOut, QuoteOut
from app.schemas.ledger import ChargeOut, PaymentOut, VisitOut
from app.services.ledger import PropertyStatus


class PropertyFields(BaseModel):
    label: ShortText
    property_type: PropertyType = PropertyType.OTHER
    address: str | None = None
    drive_folder_url: str | None = Field(default=None, max_length=500)
    notes: str | None = None
    recommendations: str | None = Field(default=None, description="Summary printed on the consultation report")


class PropertyCreate(PropertyFields):
    pass


class PropertyUpdate(BaseModel):
    label: ShortText | None = None
    property_type: PropertyType | None = None
    address: str | None = None
    drive_folder_url: str | None = Field(default=None, max_length=500)
    notes: str | None = None
    recommendations: str | None = None
    closed: bool | None = Field(default=None, description="Close or reopen the property by hand")


class PropertyOut(ORMModel, PropertyFields):
    id: str
    client_id: str
    closed_at: datetime | None
    created_at: datetime


class PropertyWithSummary(PropertyOut):
    summary: Summary


class ClientFields(BaseModel):
    name: ShortText
    phone: str | None = Field(default=None, max_length=20)
    referral_source: ReferralSource | None = None
    notes: str | None = None


class ClientCreate(ClientFields):
    property: PropertyCreate = Field(description="Every client starts with one property")


class ClientUpdate(BaseModel):
    name: ShortText | None = None
    phone: str | None = Field(default=None, max_length=20)
    referral_source: ReferralSource | None = None
    notes: str | None = None


class ClientMerge(BaseModel):
    into_client_id: str = Field(description="The client that keeps all properties")


class ClientOut(ORMModel, ClientFields):
    id: str
    created_at: datetime


class ClientListItem(ClientOut):
    property_count: int
    balance: int
    status: PropertyStatus | None
    last_activity: date | None


class ClientDetail(ClientOut):
    properties: list[PropertyWithSummary]


class ClientRef(ORMModel):
    id: str
    name: str
    phone: str | None


class PropertyDetail(PropertyWithSummary):
    client: ClientRef
    visits: list[VisitOut]
    charges: list[ChargeOut]
    payments: list[PaymentOut]
    bills: list[BillOut]
    quotes: list[QuoteOut]
