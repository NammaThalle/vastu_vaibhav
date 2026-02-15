from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class ServiceCatalog(Base):
    """Stores the master list of services offered by Vastu Vaibhav."""
    __tablename__ = "service_catalog"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    base_price = Column(Float, nullable=False, default=0.0)
    
    # Pricing type decides how the final fee is calculated (Fixed, Per-Item, Bundle)
    # Pricing type decides how the final fee is calculated (Fixed, Per-Item, Bundle)
    pricing_type = Column(String, nullable=False, default="Fixed") 
    max_free_visits = Column(Float, nullable=False, default=1)
    
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    client_services = relationship("ClientService", back_populates="service_catalog")
    addons = relationship("ServiceAddon", back_populates="service_catalog", cascade="all, delete-orphan")
