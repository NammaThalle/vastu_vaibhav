
import json
import os
from pathlib import Path
from pydantic_settings import BaseSettings

DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / "data" / "vastu.db"

def get_config_path():
    # 1. Check environment variable
    env_path = os.getenv("APP_CONFIG_PATH")
    if env_path:
        return Path(env_path)
    
    # 2. Check Docker volume mount path
    docker_path = Path("/app/config/app-settings.json")
    if docker_path.exists():
        return docker_path
        
    # 3. Local development path (relative to this file)
    return Path(__file__).resolve().parents[3] / "config" / "app-settings.json"

CONFIG_FILE_PATH = get_config_path()

def load_app_settings():
    try:
        if not CONFIG_FILE_PATH.exists():
            return {}
        with open(CONFIG_FILE_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return {}

app_settings_data = load_app_settings()

class Settings(BaseSettings):
    PROJECT_NAME: str = app_settings_data.get("project", {}).get("name", "Vastu Vaibhav")
    APP_CONFIG: dict = app_settings_data
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
