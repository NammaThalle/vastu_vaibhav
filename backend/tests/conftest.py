import os
import tempfile
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

# Point the app at a throwaway database before any app module reads settings.
_TMP = Path(tempfile.mkdtemp(prefix="vastu-tests-"))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP / 'app.db'}"
os.environ["ENVIRONMENT"] = "test"

BACKEND = Path(__file__).resolve().parents[1]


def alembic_config(url: str) -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.cmd_opts = type("Opts", (), {"x": [f"url={url}"]})()
    return cfg


def migrate(url: str, revision: str = "head") -> None:
    command.upgrade(alembic_config(url), revision)


@pytest.fixture
def db_url(tmp_path) -> str:
    url = f"sqlite:///{tmp_path / 'test.db'}"
    migrate(url)
    return url


@pytest.fixture
def session(db_url):
    from app.db.session import sync_session

    with sync_session(db_url) as s:
        yield s


@pytest.fixture
async def anon_client(tmp_path):
    """HTTP client for the app, backed by a fresh migrated database."""
    from httpx import ASGITransport, AsyncClient
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.limiter import limiter
    from app.db.session import get_db
    from app.main import app

    limiter.enabled = False  # the 5-per-minute login limit would trip across tests

    path = tmp_path / "api.db"
    migrate(f"sqlite:///{path}")
    engine = create_async_engine(f"sqlite+aiosqlite:///{path}")
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        client.db_url = f"sqlite:///{path}"
        yield client
    app.dependency_overrides.clear()
    await engine.dispose()


async def login(client, email: str, password: str = "secret-pass") -> dict:
    response = await client.post("/api/v1/login/access-token", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
async def api(anon_client):
    """Signed-in admin client with the seed catalog loaded."""
    from app.cli.seed import seed_catalog
    from app.db.session import sync_session

    await anon_client.post("/api/v1/register", json={"email": "owner@example.com", "password": "secret-pass"})
    anon_client.headers.update(await login(anon_client, "owner@example.com"))
    with sync_session(anon_client.db_url) as session:
        seed_catalog(session)
    return anon_client
