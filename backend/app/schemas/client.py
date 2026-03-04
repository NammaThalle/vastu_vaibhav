
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class ClientBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    personal_address: Optional[str] = None
    project_address: Optional[str] = None
    built_up_area: Optional[float] = None
    location_type: Optional[str] = "Goa"
    lead_status: str = "Inquiry"
    total_fees_fixed: float = 0.0
    service_id: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    full_name: Optional[str] = None
    created_at: Optional[datetime] = None

class ClientInDBBase(ClientBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_billed: float = 0.0
    current_balance: float = 0.0

    class Config:
        from_attributes = True

class Client(ClientInDBBase):
    pass

class ClientInDB(ClientInDBBase):
    pass
