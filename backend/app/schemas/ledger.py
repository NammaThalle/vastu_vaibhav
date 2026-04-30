
from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from datetime import datetime
import uuid

# Service Entry Schemas
class ServiceEntryBase(BaseModel):
    description: str
    amount: float = Field(ge=0)
    entry_type: Literal["charge", "discount"] = "charge"
    date: Optional[datetime] = None

class ServiceEntryCreate(ServiceEntryBase):
    client_id: str
    visit_id: Optional[str] = None

class ServiceEntry(ServiceEntryBase):
    id: str
    client_id: str
    visit_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ServiceEntryUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    entry_type: Optional[Literal["charge", "discount"]] = None
    date: Optional[datetime] = None

# Payment Schemas
class PaymentBase(BaseModel):
    amount: float = Field(gt=0)
    method: Optional[str] = "Cash"
    date: Optional[datetime] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    client_id: str

class Payment(PaymentBase):
    id: str
    client_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    method: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None

# Aggregated Ledger Schemas
class LedgerEntry(BaseModel):
    id: str
    type: str # "charge", "discount", or "payment"
    description: str
    amount: float
    date: datetime
    balance_after: float
    visit_id: Optional[str] = None

class ClientLedger(BaseModel):
    client_id: str
    history: List[LedgerEntry]
    total_billed: float
    total_paid: float
    current_balance: float
