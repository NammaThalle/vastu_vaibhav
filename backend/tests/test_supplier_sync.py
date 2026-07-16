"""The supplier sync against a fake Odoo portal (httpx MockTransport, synthetic pages)."""
from datetime import timedelta
from pathlib import Path

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models import SupplierOrder, SyncRun
from app.services.supplier.client import PortalClient
from app.services.supplier.sync import SyncBusy, now, run_sync, start_run

FIXTURES = Path(__file__).parent / "fixtures" / "supplier"


def page(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class FakePortal:
    def __init__(self):
        self.order_1234 = "order_on_the_way.html"
        self.requests: list[str] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        self.requests.append(f"{request.method} {path}")
        if path == "/web/login" and request.method == "GET":
            return httpx.Response(200, text=page("login.html"))
        if path == "/web/login":
            form = dict(httpx.QueryParams(request.content.decode()))
            if form.get("login") == "buyer@example.com" and form.get("password") == "right" and form.get("csrf_token") == "fake-csrf":
                return httpx.Response(303, headers={"location": "/my/orders"})
            return httpx.Response(200, text=page("login.html"))
        pages = {"/my/orders": "order_list_page1.html", "/my/orders/page/2": "order_list_page2.html",
                 "/my/orders/1300": "order_with_return.html", "/my/orders/1234": self.order_1234,
                 "/my/orders/1100": "order_does_not_add_up.html"}
        if path in pages:
            return httpx.Response(200, text=page(pages[path]))
        return httpx.Response(404, text="not found")


@pytest.fixture
async def db(api):
    engine = create_async_engine(api.db_url.replace("sqlite://", "sqlite+aiosqlite://"))
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as session:
        yield session
    await engine.dispose()


def client(portal: FakePortal, password: str = "right") -> PortalClient:
    return PortalClient("https://shop.example.com", "buyer@example.com", password,
                        transport=httpx.MockTransport(portal), pause=0)


async def test_sync_reads_new_orders_and_follows_them_to_received(db):
    portal = FakePortal()
    run = await run_sync(db, await start_run(db), client(portal))
    assert (run.orders_added, run.orders_updated, run.ok) == (2, 0, False)
    assert "S01310" in run.message  # the page that does not add up is reported, not saved

    orders = {o.reference: o for o in await db.scalars(select(SupplierOrder))}
    assert set(orders) == {"S01234", "S01300"}
    assert orders["S01234"].status == "on_the_way" and orders["S01234"].external_id == "1234"
    assert orders["S01300"].status == "received" and "WH/IN/00007" in orders["S01300"].needs_review
    assert len(orders["S01234"].lines) == 5 and orders["S01234"].total == 5800

    portal.order_1234 = "order_received.html"
    portal.requests.clear()
    run = await run_sync(db, await start_run(db), client(portal))
    assert (run.orders_added, run.orders_updated) == (0, 1)
    await db.refresh(orders["S01234"])
    assert orders["S01234"].status == "received" and str(orders["S01234"].received_on) == "2026-11-14"
    assert "GET /my/orders/1300" not in portal.requests  # received orders are not fetched again


async def test_wrong_password_is_reported_and_nothing_else_is_fetched(db):
    portal = FakePortal()
    run = await run_sync(db, await start_run(db), client(portal, password="wrong"))
    assert run.ok is False and "did not accept the login" in run.message
    assert portal.requests == ["GET /web/login", "POST /web/login"]
    assert "wrong" not in run.message


async def test_only_one_sync_at_a_time(db):
    await start_run(db)
    with pytest.raises(SyncBusy):
        await start_run(db)
    stuck = await db.scalar(select(SyncRun))
    stuck.started_at = now() - timedelta(hours=1)
    await db.commit()
    await start_run(db)  # a run stuck for an hour no longer blocks
    await db.refresh(stuck)
    assert stuck.ok is False and stuck.finished_at is not None
