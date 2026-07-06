from tests.conftest import login


async def test_bootstrap_admin_then_admin_only_user_creation(anon_client):
    client = anon_client
    created = await client.post("/api/v1/register", json={"email": "owner@example.com", "password": "secret-pass"})
    assert created.status_code == 200 and created.json()["is_admin"] is True

    closed = await client.post("/api/v1/register", json={"email": "x@example.com", "password": "secret-pass"})
    assert closed.status_code == 403

    admin = await login(client, "owner@example.com")
    assert (await client.get("/api/v1/login/me", headers=admin)).json()["email"] == "owner@example.com"

    father = await client.post("/api/v1/register", headers=admin,
                               json={"email": "father@example.com", "password": "secret-pass"})
    assert father.status_code == 200 and father.json()["is_admin"] is False

    father_auth = await login(client, "father@example.com")
    blocked = await client.post("/api/v1/register", headers=father_auth,
                                json={"email": "third@example.com", "password": "secret-pass"})
    assert blocked.status_code == 403
    assert (await client.get("/api/v1/users", headers=father_auth)).status_code == 403
    assert len((await client.get("/api/v1/users", headers=admin)).json()) == 2

    deactivated = await client.patch(f"/api/v1/users/{father.json()['id']}", headers=admin, json={"is_active": False})
    assert deactivated.json()["is_active"] is False
    assert (await client.get("/api/v1/home", headers=father_auth)).status_code == 401


async def test_business_routes_need_login(anon_client):
    for path in ("/api/v1/home", "/api/v1/clients", "/api/v1/catalog"):
        assert (await anon_client.get(path)).status_code == 401
    assert (await anon_client.get("/api/health")).json() == {"status": "ok"}
