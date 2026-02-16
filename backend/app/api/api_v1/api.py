
from fastapi import APIRouter
from app.api.api_v1.endpoints import login, clients, visits, ledger, services, dashboard

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(visits.router, prefix="/visits", tags=["visits"])
api_router.include_router(ledger.router, prefix="/ledger", tags=["ledger"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
