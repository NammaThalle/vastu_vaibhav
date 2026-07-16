"""One supplier sync: sign in, list orders, read new and unfinished ones, save them."""
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import SupplierOrder, SyncRun
from app.models.enums import OrderSource, SupplierOrderStatus
from app.services.supplier.client import PortalClient, SignInError
from app.services.supplier.parse import OrderReadError, parse_order_list, parse_order_page
from app.services.supplier.store import DuplicateOrder, get_supplier, save_order

STALE_AFTER = timedelta(minutes=15)


def redact(text: str) -> str:
    """Order links carry access tokens; keep them out of messages shown in the app."""
    return re.sub(r"(access_token=)[^&\s'\"]+", r"\1...", text)


class SyncBusy(RuntimeError):
    pass


def now() -> datetime:
    return datetime.now(timezone.utc)


def default_client() -> PortalClient:
    return PortalClient(settings.SUPPLIER_BASE_URL, settings.SUPPLIER_LOGIN,
                        settings.SUPPLIER_PASSWORD.get_secret_value())


async def start_run(db: AsyncSession) -> SyncRun:
    """Record a new run, refusing while another one started recently and has not finished."""
    running = await db.scalar(select(SyncRun).where(SyncRun.finished_at.is_(None)).order_by(SyncRun.started_at.desc()))
    if running is not None:
        started = running.started_at if running.started_at.tzinfo else running.started_at.replace(tzinfo=timezone.utc)
        if now() - started < STALE_AFTER:
            raise SyncBusy("A supplier sync is already running")
        running.finished_at, running.ok, running.message = now(), False, "Stopped without finishing"
    run = SyncRun(started_at=now(), orders_added=0, orders_updated=0)
    db.add(run)
    await db.commit()
    return run


async def run_sync(db: AsyncSession, run: SyncRun, client: PortalClient | None = None) -> SyncRun:
    problems: list[str] = []
    already_pasted = 0
    try:
        async with (client or default_client()) as portal:
            await portal.sign_in()
            links: dict[str, str] = {}
            for page in await portal.order_list_pages():
                links.update(parse_order_list(page))
            supplier = await get_supplier(db)
            known = {o.external_id: o for o in await db.scalars(
                select(SupplierOrder).where(SupplierOrder.supplier_id == supplier.id, SupplierOrder.external_id.is_not(None)))}
            for external_id in sorted(links, key=int):
                existing = known.get(external_id)
                if existing is not None and existing.status != SupplierOrderStatus.ON_THE_WAY:
                    continue
                try:
                    parsed = parse_order_page(await portal.order_page(links[external_id]))
                    if parsed.external_id is None:
                        parsed.external_id = external_id
                    _, created = await save_order(db, parsed, OrderSource.SYNC)
                    await db.commit()
                    if created:
                        run.orders_added += 1
                    else:
                        run.orders_updated += 1
                except DuplicateOrder:
                    # Already entered by paste: not a problem, and nothing to save twice.
                    already_pasted += 1
                except OrderReadError as error:
                    # Raised before anything is written, so there is nothing to undo.
                    problems.append(str(error))
        run.ok = not problems
        summary = f"{run.orders_added} new, {run.orders_updated} checked" + (
            f", {already_pasted} already pasted" if already_pasted else "")
        run.message = redact(summary + ("; " + "; ".join(problems[:5]) if problems else ""))
    except SignInError as error:
        run.ok, run.message = False, str(error)
    except Exception as error:  # network trouble, unexpected pages: record it, never crash the caller
        run.ok, run.message = False, redact(f"Sync failed: {type(error).__name__}: {error}")[:500]
    run.finished_at = now()
    db.add(run)
    await db.commit()
    return run
