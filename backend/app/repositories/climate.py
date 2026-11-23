import hashlib
from datetime import UTC, date, datetime

from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.core.config import NASA_DOCS
from app.db.models import Dataset, FetchRun, Location, Observation, Variable
from app.providers.nasa_power import DESCRIPTIONS, PRODUCT, PROVIDER, TIME_STANDARD, UNITS, Download
from app.schemas.climate import Period


def upsert(session, model):
    dialect = session.get_bind().dialect.name
    if dialect == "sqlite":
        return sqlite_insert(model.__table__)
    if dialect == "postgresql":
        return postgres_insert(model.__table__)
    raise ValueError("DATABASE_URL debe usar SQLite o PostgreSQL")


def latest_run(
    session,
    key: str,
    response_hash: str | None = None,
    fetched_at: datetime | None = None,
) -> FetchRun | None:
    query = select(FetchRun).where(FetchRun.request_key == key)
    if response_hash is not None:
        query = query.where(FetchRun.response_hash == response_hash)
    if fetched_at is not None:
        query = query.where(FetchRun.fetched_at == fetched_at.astimezone(UTC))
    return session.scalar(query.order_by(FetchRun.fetched_at.desc(), FetchRun.id.desc()).limit(1))


def save_run(
    session, location: Location, period: Period, key: str, download: Download, rows: list[dict]
) -> FetchRun:
    # A different POWER API version or source grid has a separate variable identity.
    sources = download.metadata["header"].get("sources", [])
    product_version = f"{download.version}:{','.join(sorted(sources))}"
    dataset_id = hashlib.sha256(product_version.encode()).hexdigest()[:24]
    session.execute(
        upsert(session, Dataset)
        .values(
            id=dataset_id,
            provider=PROVIDER,
            product=PRODUCT,
            version=product_version,
            resolution_text=download.resolution,
            temporal_standard=TIME_STANDARD,
            documentation_url=NASA_DOCS,
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    variables = {code: f"{dataset_id}:{code}" for code in UNITS}
    session.execute(
        upsert(session, Variable).on_conflict_do_nothing(index_elements=["id"]),
        [
            {
                "id": variables[code],
                "dataset_id": dataset_id,
                "code": code,
                "unit": unit,
                "description": DESCRIPTIONS[code],
            }
            for code, unit in UNITS.items()
        ],
    )
    run = FetchRun(
        location_id=location.id,
        dataset_id=dataset_id,
        start_date=period.start,
        end_date=period.end,
        request_key=key,
        fetched_at=download.fetched_at.astimezone(UTC),
        status="complete",
        metadata_json=download.metadata,
        response_hash=download.response_hash,
        snapshot=rows,
    )
    session.add(run)
    session.flush()

    statement = upsert(session, Observation)
    incoming = statement.excluded
    newer_run = (
        select(FetchRun.fetched_at)
        .where(FetchRun.id == Observation.fetch_run_id)
        .correlate(Observation.__table__)
        .scalar_subquery()
    )
    statement = statement.on_conflict_do_update(
        index_elements=["location_id", "variable_id", "date"],
        set_={
            "value": incoming.value,
            "quality_flag": incoming.quality_flag,
            "fetch_run_id": incoming.fetch_run_id,
        },
        where=or_(
            Observation.value.is_(None) & incoming.value.is_not(None),
            (newer_run <= run.fetched_at)
            & or_(Observation.value.is_(None), incoming.value.is_not(None)),
        ),
    )
    session.execute(
        statement,
        [
            {
                "location_id": location.id,
                "variable_id": variables[code],
                "date": date.fromisoformat(row["date"]),
                "value": row[code.lower()],
                "quality_flag": row["quality_flags"].get(code.lower(), "ok"),
                "fetch_run_id": run.id,
            }
            for row in rows
            for code in UNITS
        ],
    )
    return run
