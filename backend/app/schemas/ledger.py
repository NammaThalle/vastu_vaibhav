
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

# Service Entry Schemas
class ServiceEntryBase(BaseModel):
    description: str
    amount: float
    date: Optional[datetime] = None

class ServiceEntryCreate(ServiceEntryBase):
    client_id: str

class ServiceEntry(ServiceEntryBase):
    id: str
    client_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    amount: float
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

# Aggregated Ledger Schemas
class LedgerEntry(BaseModel):
    id: str
    type: str # "charge" or "payment"
    description: str
    amount: float
    date: datetime
    balance_after: float

class ClientLedger(BaseModel):
    client_id: str
    history: List[LedgerEntry]
    total_billed: float
    total_paid: float
    current_balance: float
