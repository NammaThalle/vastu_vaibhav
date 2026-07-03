import os
import tempfile
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

# Point the app at a throwaway database before any app module reads settings.
_TMP = Path(tempfile.mkdtemp(prefix="vastu-tests-"))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP / 'app.db'}"
os.environ["ENVIRONMENT"] = "test"

BACKEND = Path(__file__).resolve().parents[1]


def alembic_config(url: str) -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.cmd_opts = type("Opts", (), {"x": [f"url={url}"]})()
    return cfg


def migrate(url: str, revision: str = "head") -> None:
    command.upgrade(alembic_config(url), revision)


@pytest.fixture
def db_url(tmp_path) -> str:
    url = f"sqlite:///{tmp_path / 'test.db'}"
    migrate(url)
    return url


@pytest.fixture
def session(db_url):
    from app.db.session import sync_session

    with sync_session(db_url) as s:
        yield s
