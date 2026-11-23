from sqlalchemy import create_engine, event, make_url
from sqlalchemy.orm import sessionmaker


def make_engine(url: str):
    sqlite = make_url(url).get_backend_name() == "sqlite"
    engine = create_engine(url, hide_parameters=True)
    if sqlite:

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

    return engine


def make_sessions(url: str):
    return sessionmaker(make_engine(url), expire_on_commit=False)
