from typing import Any
from fastapi import APIRouter, Body
from pydantic import BaseModel
from app.utils.logger import logger

router = APIRouter()

class FrontendLog(BaseModel):
    level: str
    message: str
    context: dict[str, Any] = None

@router.post("/logs/frontend")
async def log_frontend_event(log: FrontendLog) -> Any:
    """
    Receives logs from the frontend and prints them to the server terminal.
    """
    level_map = {
        "debug": logger.debug,
        "info": logger.info,
        "warning": logger.warning,
        "error": logger.error,
        "critical": logger.critical
    }
    
    log_func = level_map.get(log.level.lower(), logger.info)
    
    # Use 'extra' to pass the source to our custom formatter
    log_func(
        "%s %s", 
        log.message, 
        f"({log.context})" if log.context else "",
        extra={"source": "FRONTEND"}
    )
    
    return {"status": "ok"}
