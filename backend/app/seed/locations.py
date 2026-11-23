import json
from typing import Annotated

from pydantic import Field, TypeAdapter

from app.core.config import ROOT, Settings
from app.db.models import Location
from app.db.session import make_sessions
from app.repositories.climate import upsert
from app.schemas.climate import LocationOut


class CatalogLocation(LocationOut):
    id: Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")]
    latitude: Annotated[float, Field(ge=-90, le=90)]
    longitude: Annotated[float, Field(ge=-180, le=180)]


def seed(sessions) -> int:
    catalog = TypeAdapter(list[CatalogLocation]).validate_json(
        (ROOT / "data" / "catalog" / "locations.json").read_bytes()
    )
    with sessions.begin() as session:
        statement = upsert(session, Location)
        session.execute(
            statement.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    column.name: statement.excluded[column.name]
                    for column in Location.__table__.columns
                    if column.name != "id"
                },
            ),
            [location.model_dump() for location in catalog],
        )
    return len(catalog)


if __name__ == "__main__":
    print(json.dumps({"localidades": seed(make_sessions(Settings().database_url))}))
