
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class ClientBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    project_address: Optional[str] = None
    location_type: str = "Goa"
    lead_status: str = "Inquiry"
    total_fees_fixed: float = 0.0

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    full_name: Optional[str] = None

class ClientInDBBase(ClientBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Client(ClientInDBBase):
    pass

class ClientInDB(ClientInDBBase):
    pass
