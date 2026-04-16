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
    
    # ── Simple Pass-through ──
    message = log.message
    ctx = log.context
    
    if ctx:
        # If there's still metadata, append it concisely
        ctx_str = ", ".join([f"{k}: {str(v)[:20]}" for k, v in ctx.items()])
        message = f"{message} ({ctx_str})"

    # Use 'extra' to pass the source to our custom formatter
    log_func(message, extra={"source": "FRONTEND"})
    
    return {"status": "ok"}
