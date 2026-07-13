from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect

import app.models  # noqa: F401
from app.db.base import Base
from tests.conftest import alembic_config, migrate


def test_head_matches_models(tmp_path):
    """Running every migration on an empty database gives exactly what the models describe."""
    url = f"sqlite:///{tmp_path / 'm.db'}"
    migrate(url)
    with create_engine(url).connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn, opts={"compare_type": True}), Base.metadata)
    assert diff == []


def test_alembic_check_passes(tmp_path):
    url = f"sqlite:///{tmp_path / 'm.db'}"
    migrate(url)
    command.check(alembic_config(url))


def test_downgrade_to_base_and_back(tmp_path):
    url = f"sqlite:///{tmp_path / 'm.db'}"
    migrate(url)
    command.downgrade(alembic_config(url), "base")
    assert set(inspect(create_engine(url)).get_table_names()) == {"alembic_version"}
    migrate(url)
