import pytest
from alembic import command
from alembic.config import Config

from app.core.config import Settings
from app.db.session import make_sessions
from app.seed.locations import seed


@pytest.fixture
def settings(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'test.sqlite3').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", url)
    command.upgrade(Config("alembic.ini"), "head")
    return Settings(database_url=url)


@pytest.fixture
def sessions(settings):
    factory = make_sessions(settings.database_url)
    seed(factory)
    yield factory
    factory.kw["bind"].dispose()
