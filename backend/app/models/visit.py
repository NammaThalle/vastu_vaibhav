
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class Visit(Base):
    __tablename__ = "visits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())
    purpose = Column(String, nullable=True)
    observations = Column(Text, nullable=True)
    
    # For tracking supplementary visits (e.g. ₹ 500 charge)
    is_supplementary = Column(Boolean, default=False)
    fee_incurred = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    client = relationship("Client", back_populates="visits")
