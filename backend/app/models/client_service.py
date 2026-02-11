from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class ClientService(Base):
    """Tracks a specific service (or bundle) assigned to a client."""
    __tablename__ = "client_services"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    service_catalog_id = Column(String, ForeignKey("service_catalog.id", ondelete="RESTRICT"), nullable=False)
    
    status = Column(String, default="Pending") # Pending, In_Progress, Completed, Cancelled
    calculated_fee = Column(Float, nullable=False, default=0.0)
    
    # Store variable data like selected rooms, quantities, or specific inclusions (JSON string)
    service_details = Column(Text, nullable=True) 

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    client = relationship("Client", back_populates="services")
    service_catalog = relationship("ServiceCatalog", back_populates="client_services")
