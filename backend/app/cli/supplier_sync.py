"""Fetch new and unfinished orders from the supplier's portal. Run daily from the host crontab.

Usage: python -m app.cli.supplier_sync
Without SUPPLIER_LOGIN and SUPPLIER_PASSWORD it does nothing, so the cron line is harmless
until the login is added to the server's .env.
"""
import asyncio
import sys

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.supplier.sync import SyncBusy, run_sync, start_run


async def main() -> int:
    if not settings.supplier_sync_enabled:
        print("Supplier sync skipped: SUPPLIER_LOGIN and SUPPLIER_PASSWORD are not set.")
        return 0
    async with AsyncSessionLocal() as db:
        try:
            run = await run_sync(db, await start_run(db))
        except SyncBusy as error:
            print(error)
            return 0
    print(("Supplier sync ok: " if run.ok else "Supplier sync problem: ") + (run.message or ""))
    return 0 if run.ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
