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
    
    # ── Formatting for readability ──
    message = log.message
    ctx = log.context or {}
    
    # Example: "Client view opened" + {clientId: 'abc...'} -> "Client: abc"
    if "Client view opened" in message and "clientId" in ctx:
        pwa_tag = "PWA" if ctx.get("isPWA") else "Web"
        platform = ctx.get("platform", "Unknown")
        message = f"Client View: {ctx['clientId'][:6]} ({pwa_tag}/{platform})"
    
    elif "Tab switched" in message and "tab" in ctx:
        message = f"Tab: {ctx['tab']}"
    
    elif "Sharing invoice" in message:
        message = f"Share: {ctx.get('clientName', 'Invoice')}"
    
    elif "Downloading invoice" in message:
        message = f"Download: {ctx.get('fileName', 'PDF')}"
        
    elif ctx:
        # For other logs with context, just show a snippet
        ctx_str = ", ".join([f"{k}: {str(v)[:10]}" for k, v in ctx.items()])
        message = f"{message} ({ctx_str})"

    # Use 'extra' to pass the source to our custom formatter
    log_func(message, extra={"source": "FRONTEND"})
    
    return {"status": "ok"}
