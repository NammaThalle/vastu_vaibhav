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

    assert created.json()["is_admin"] is True

    closed = await client.post("/api/v1/register", json={"email": "other@example.com", "password": "secret-pass"})
    assert closed.status_code == 403

    login = await client.post("/api/v1/login/access-token",
                              data={"username": "owner@example.com", "password": "secret-pass"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    admin = {"Authorization": f"Bearer {token}"}
    me = await client.get("/api/v1/login/me", headers=admin)
    assert me.json()["email"] == "owner@example.com"

    father = await client.post("/api/v1/register", headers=admin,
                               json={"email": "father@example.com", "password": "secret-pass"})
    assert father.status_code == 200 and father.json()["is_admin"] is False

    father_login = await client.post("/api/v1/login/access-token",
                                     data={"username": "father@example.com", "password": "secret-pass"})
    father_headers = {"Authorization": f"Bearer {father_login.json()['access_token']}"}
    blocked = await client.post("/api/v1/register", headers=father_headers,
                                json={"email": "third@example.com", "password": "secret-pass"})
    assert blocked.status_code == 403

    assert (await client.get("/api/health")).json() == {"status": "ok"}
