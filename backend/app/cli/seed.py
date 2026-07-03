"""Load the starting catalog. Safe to run repeatedly: it only adds items that are missing
and never changes prices that were edited in the app.

Usage: python -m app.cli.seed [--url sqlite:///path/to.db]
"""
import argparse
import tomllib
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import sync_session
from app.models import CatalogItem
from app.models.enums import ItemKind

CATALOG_FILE = Path(__file__).resolve().parents[2] / "seeds" / "catalog.toml"


def load_catalog(path: Path = CATALOG_FILE) -> list[CatalogItem]:
    data = tomllib.loads(path.read_text())
    items = []
    for kind in ItemKind:
        for entry in data.get(kind.value, []):
            items.append(
                CatalogItem(
                    kind=kind,
                    name=entry["name"],
                    size_ml=entry.get("size_ml"),
                    unit_price=Decimal(str(entry["price"])),
                )
            )
    return items


def seed_catalog(session: Session) -> int:
    existing = {(i.kind, i.name.lower(), i.size_ml) for i in session.scalars(select(CatalogItem))}
    added = 0
    for item in load_catalog():
        if (item.kind, item.name.lower(), item.size_ml) not in existing:
            session.add(item)
            added += 1
    session.commit()
    return added


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="database URL (defaults to DATABASE_URL)")
    args = parser.parse_args()
    with sync_session(args.url) as session:
        added = seed_catalog(session)
    print(f"Catalog seed: {added} item(s) added")


if __name__ == "__main__":
    main()
