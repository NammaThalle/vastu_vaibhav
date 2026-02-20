
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import asyncio
import os
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import settings
from app.api.api_v1.api import api_router

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

app.include_router(api_router, prefix="/api/v1")

# Mount Static Files (Frontend)
# We serve the 'static' directory which contains the Next.js export
# root_path = os.path.join(os.path.dirname(__file__), "..", "static") # Docker Layout
static_dir = "/app/static"

@app.get("/health")
def health_check():
    return {"status": "ok", "db_type": "sqlite"}

# API must differ from UI routes. 
# Since Next.js export creates .html files, we need to handle routing carefully.
# For a PWA/SPA, we usually serve index.html for unknown routes, but with static export, we map direct paths.

if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

@app.get("/")
def read_root():
    # Fallback if static mount doesn't catch root (it should with html=True)
    return {"message": f"Welcome to {settings.PROJECT_NAME} API. Frontend should be serving here."}
