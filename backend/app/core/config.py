import json
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB_PATH = REPO_ROOT / "data" / "vastu.db"


def get_config_path() -> Path:
    env_path = os.getenv("APP_CONFIG_PATH")
    if env_path:
        return Path(env_path)
    docker_path = Path("/app/config/app-settings.json")
    if docker_path.exists():
        return docker_path
    return REPO_ROOT / "config" / "app-settings.json"


def load_app_settings() -> dict:
    path = get_config_path()
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Vastu Vaibhav"
    APP_CONFIG: dict = {}
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"
    SECRET_KEY: str = "change_me_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    ALGORITHM: str = "HS256"
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @property
    def sync_database_url(self) -> str:
        """Same database with the synchronous driver, used by Alembic and CLI commands."""
        return self.DATABASE_URL.replace("+aiosqlite", "")


settings = Settings()
if not settings.APP_CONFIG:
    settings.APP_CONFIG = load_app_settings()
    settings.PROJECT_NAME = settings.APP_CONFIG.get("project", {}).get("name", settings.PROJECT_NAME)
