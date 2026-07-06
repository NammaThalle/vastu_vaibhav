"""Snapshot the SQLite database safely while the app is running, gzip it, and keep
the most recent copies (four by default, one per weekly run).

Usage: python -m app.cli.backup --dest /backups [--keep 4]
"""
import argparse
import gzip
import shutil
import sqlite3
import tempfile
from datetime import datetime
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import settings


def backup(dest: Path, keep: int) -> Path:
    source = Path(make_url(settings.sync_database_url).database)
    if not source.exists():
        raise SystemExit(f"Database not found: {source}")
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / f"vastu_{datetime.now():%Y-%m-%d_%H-%M-%S}.db.gz"

    with tempfile.TemporaryDirectory() as tmp:
        snapshot = Path(tmp) / "snapshot.db"
        with sqlite3.connect(source) as src, sqlite3.connect(snapshot) as dst:
            src.backup(dst)
        with open(snapshot, "rb") as f_in, gzip.open(target, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)

    for old in sorted(dest.glob("vastu_*.db.gz"))[:-keep]:
        old.unlink()
    return target


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dest", type=Path, required=True)
    parser.add_argument("--keep", type=int, default=4)
    args = parser.parse_args()
    print(f"Backup written: {backup(args.dest, args.keep)}")


if __name__ == "__main__":
    main()
