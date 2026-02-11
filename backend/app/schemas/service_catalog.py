from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ServiceCatalogBase(BaseModel):
    name: str
    description: Optional[str] = None
    base_price: float = 0.0
    pricing_type: str = "Fixed"
    is_active: bool = True

class ServiceCatalogCreate(ServiceCatalogBase):
    pass

class ServiceCatalogUpdate(ServiceCatalogBase):
    name: Optional[str] = None
    pricing_type: Optional[str] = None

class ServiceCatalogInDBBase(ServiceCatalogBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ServiceCatalog(ServiceCatalogInDBBase):
    pass
