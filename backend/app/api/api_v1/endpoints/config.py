from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/")
def get_app_config():
    """
    Get the dynamic application configuration loaded from app-settings.json.
    """
    return settings.APP_CONFIG
