
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from app.utils.logger import logger

# Create Async Engine
logger.info("Initializing Async Database Engine for: %s", settings.DATABASE_URL.split("///")[-1])
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False, # Disable raw SQL query logging
    future=True,
    # SQLite specific args for concurrency
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

# Async Session Factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()

# Dependency for API endpoints
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
