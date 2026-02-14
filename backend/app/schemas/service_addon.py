from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ServiceAddonBase(BaseModel):
    name: str
    price: float = 0.0

class ServiceAddonCreate(ServiceAddonBase):
    pass

class ServiceAddonUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None

class ServiceAddonInDBBase(ServiceAddonBase):
    id: str
    service_catalog_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ServiceAddon(ServiceAddonInDBBase):
    pass
