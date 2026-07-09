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


async def test_me_works_for_stored_emails_that_fail_strict_validation(anon_client, tmp_path):
    """Accounts imported from the old app keep working even if their email would not pass today's checks."""
    from app.core.security import get_password_hash
    from app.db.session import sync_session
    from app.models import User

    with sync_session(anon_client.db_url) as session:
        session.add(User(email="admin@home.test", hashed_password=get_password_hash("secret-pass"), is_admin=True))
        session.commit()
    me = await anon_client.get("/api/v1/login/me", headers=await login(anon_client, "admin@home.test"))
    assert me.status_code == 200 and me.json()["email"] == "admin@home.test"
