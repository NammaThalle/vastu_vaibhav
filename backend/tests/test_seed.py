from decimal import Decimal

from app.cli.seed import load_catalog, seed_catalog
from app.models import CatalogItem


def test_seed_is_repeatable_and_keeps_edited_prices(session):
    total = len(load_catalog())
    assert seed_catalog(session) == total

    item = session.query(CatalogItem).filter_by(name="Toilet Blocker").one()
    item.unit_price = Decimal("1750")
    session.commit()

    assert seed_catalog(session) == 0
    assert session.query(CatalogItem).count() == total
    assert session.get(CatalogItem, item.id).unit_price == Decimal("1750")
