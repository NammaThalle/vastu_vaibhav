from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.limiter import limiter
from app.utils.logger import logger, setup_logging

setup_logging()

if settings.ENVIRONMENT.lower() == "production" and settings.SECRET_KEY == "change_me_in_production":
    raise RuntimeError("SECRET_KEY must be set in production")

app = FastAPI(title=settings.PROJECT_NAME, version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# In production the web and api containers share one origin behind Caddy, so CORS only
# matters for the local Next.js dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "ok"}


logger.info("%s API ready", settings.PROJECT_NAME)
