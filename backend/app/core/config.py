
from pathlib import Path
from pydantic_settings import BaseSettings

DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / "data" / "vastu.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vastu Vaibhav"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"
    SECRET_KEY: str = "change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    FRONTEND_URL: str = "http://127.0.0.1:8000"
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000", "http://127.0.0.1:8000"]
    RUN_STARTUP_MIGRATIONS: bool = False

    class Config:
        env_file = ".env"

settings = Settings()

from app.utils.logger import logger
if settings.SECRET_KEY == "change_me_in_production":
    logger.warning("SECURITY WARNING: Running with default SECRET_KEY. Change this in production via .env!")
