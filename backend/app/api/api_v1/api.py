from fastapi import APIRouter, Depends

from app.api import deps
from app.api.api_v1.endpoints import config, login, utils

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(
    utils.router, prefix="/utils", tags=["utils"], dependencies=[Depends(deps.get_current_user)]
)
