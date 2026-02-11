from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ClientServiceBase(BaseModel):
    client_id: str
    service_catalog_id: str
    status: str = "Pending"
    calculated_fee: float = 0.0
    service_details: Optional[str] = None

class ClientServiceCreate(ClientServiceBase):
    pass

class ClientServiceUpdate(BaseModel):
    status: Optional[str] = None
    calculated_fee: Optional[float] = None
    service_details: Optional[str] = None

class ClientServiceInDBBase(ClientServiceBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClientService(ClientServiceInDBBase):
    pass
