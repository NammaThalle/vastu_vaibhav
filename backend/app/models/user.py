
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

# Note: SQLite doesn't have native UUID type, so we use String(36)
# SQLAlchemy's UUID type should handle this automatically or we might need a custom type decorator if using strict Mode.
# For now, using String is safer for SQLite compatibility in raw SQL inspections, but let's try standard UUID first.
# Actually, for SQLite it's better to use String(36) to avoid issues if we ever migrate back to Postgres (though UUID works there too).
# Let's use a conditional type or just String for now to be safe with SQLite.

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # 2FA
    twofa_secret = Column(String, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
