from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class ServiceAddon(Base):
    """Stores the specific sub-charges and configurable addons per service type."""
    __tablename__ = "service_addons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    service_catalog_id = Column(String, ForeignKey("service_catalog.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    service_catalog = relationship("ServiceCatalog", back_populates="addons")
