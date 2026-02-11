
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String, index=True, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    # CRM Specifics
    project_address = Column(String, nullable=True)
    location_type = Column(String, default="Goa") # Goa, Karnataka, Maharashtra, etc.
    lead_status = Column(String, default="Inquiry") # Inquiry, Active, Completed, Inactive
    
    # Totals (can be calculated dynamically, but good for caching)
    total_fees_fixed = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    services = relationship("ClientService", back_populates="client", cascade="all, delete-orphan")
    visits = relationship("Visit", back_populates="client", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="client", cascade="all, delete-orphan")
