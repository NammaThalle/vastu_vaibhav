from sqlalchemy import CheckConstraint, Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

class ServiceEntry(Base):
    __tablename__ = "service_entries"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_service_entries_amount_non_negative"),
        CheckConstraint(
            "entry_type IN ('charge', 'discount')",
            name="ck_service_entries_entry_type",
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    visit_id = Column(String, ForeignKey("visits.id", ondelete="CASCADE"), nullable=True)
    description = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    entry_type = Column(String, nullable=False, default="charge")
    date = Column(DateTime(timezone=True), server_default=func.now())
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    client = relationship("Client", back_populates="service_entries")
    visit = relationship("Visit", back_populates="ledger_entries")
