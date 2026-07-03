import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from tests.conftest import migrate


@pytest.fixture
async def client():
    migrate(settings.sync_database_url)
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def test_bootstrap_register_login_and_me(client):
    created = await client.post("/api/v1/register", json={"email": "owner@example.com", "password": "secret-pass"})
    assert created.status_code == 200

    closed = await client.post("/api/v1/register", json={"email": "other@example.com", "password": "secret-pass"})
    assert closed.status_code == 403

    login = await client.post("/api/v1/login/access-token",
                              data={"username": "owner@example.com", "password": "secret-pass"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = await client.get("/api/v1/login/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == "owner@example.com"

    assert (await client.get("/api/health")).json() == {"status": "ok"}
