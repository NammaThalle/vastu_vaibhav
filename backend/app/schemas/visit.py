
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class VisitBase(BaseModel):
    date: Optional[datetime] = None
    purpose: Optional[str] = None
    observations: Optional[str] = None

class VisitCreate(VisitBase):
    client_id: str

class VisitUpdate(VisitBase):
    pass

class VisitInDBBase(VisitBase):
    id: str
    client_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Visit(VisitInDBBase):
    pass

class VisitInDB(VisitInDBBase):
    pass
