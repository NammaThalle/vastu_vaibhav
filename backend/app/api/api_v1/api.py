
from fastapi import APIRouter, Depends
from app.api.api_v1.endpoints import login, clients, visits, ledger, services, dashboard, utils, config
from app.api import deps

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
protected_dependencies = [Depends(deps.get_current_user)]
api_router.include_router(clients.router, prefix="/clients", tags=["clients"], dependencies=protected_dependencies)
api_router.include_router(services.router, prefix="/services", tags=["services"], dependencies=protected_dependencies)
api_router.include_router(visits.router, prefix="/visits", tags=["visits"], dependencies=protected_dependencies)
api_router.include_router(ledger.router, prefix="/ledger", tags=["ledger"], dependencies=protected_dependencies)
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"], dependencies=protected_dependencies)
api_router.include_router(utils.router, prefix="/utils", tags=["utils"], dependencies=protected_dependencies)
api_router.include_router(config.router, prefix="/config", tags=["config"], dependencies=protected_dependencies)
