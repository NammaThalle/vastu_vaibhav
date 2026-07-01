from fastapi import APIRouter, Depends
from app.core.config import settings
from app.api import deps
from app.models.user import User

router = APIRouter()

@router.get("/")
def get_app_config(current_user: User = Depends(deps.get_current_user)):
    """
    Get the dynamic application configuration loaded from app-settings.json.
    """
    return settings.APP_CONFIG
