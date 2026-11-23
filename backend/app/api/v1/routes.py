from datetime import date, datetime
from typing import Annotated

import httpx
from fastapi import APIRouter, Query, Request, Response
from pydantic import AwareDatetime
from sqlalchemy import select

from app.core.errors import ApiError
from app.db.models import Location
from app.schemas.climate import (
    ClimateComparison,
    ClimateExploration,
    ClimateMonthlyComparison,
    ClimateSeries,
    ClimateSummary,
    Grouping,
    LocationOut,
    Period,
)
from app.services.climate import PERU, get_series, validate_period
from app.services.comparison import compare
from app.services.csv_export import render_csv
from app.services.indicators import summarize

router = APIRouter(prefix="/api/v1")

IsoDate = Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")]
LocationId = Annotated[str, Query(min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")]
LocationIds = Annotated[list[LocationId], Query(min_length=2, max_length=3)]


@router.get("/locations", response_model=list[LocationOut])
def list_locations(request: Request):
    with request.app.state.sessions() as session:
        return session.scalars(select(Location).order_by(Location.region, Location.name)).all()


def parse_period(start: IsoDate, end: IsoDate) -> Period:
    try:
        return Period(start=date.fromisoformat(start), end=date.fromisoformat(end))
    except ValueError as exc:
        raise ApiError(422, "invalid_period", "Usa fechas válidas en formato AAAA-MM-DD.") from exc


def load_series(
    request: Request,
    period: Period,
    location_ids: list[str],
    response_hash: str | None = None,
    snapshot_fetched_at: datetime | None = None,
) -> list[ClimateSeries]:
    state = request.app.state
    settings = state.settings
    with httpx.Client(timeout=settings.nasa_timeout_seconds, follow_redirects=False) as client:
        return [
            get_series(
                state.sessions,
                client,
                settings,
                location_id,
                period,
                response_hash=response_hash,
                snapshot_fetched_at=snapshot_fetched_at,
            )
            for location_id in location_ids
        ]


@router.get("/climate/series", response_model=ClimateSeries)
def series(request: Request, location_id: LocationId, start: IsoDate, end: IsoDate):
    return load_series(request, parse_period(start, end), [location_id])[0]


@router.get("/climate/summary", response_model=ClimateExploration | ClimateSummary)
def summary(
    request: Request,
    location_id: LocationId,
    start: IsoDate,
    end: IsoDate,
    group_by: Grouping = "period",
    include_series: bool = False,
):
    series = load_series(request, parse_period(start, end), [location_id])[0]
    result = summarize(series, group_by, request.app.state.settings)
    if include_series:
        return ClimateExploration(**result.model_dump(), series=series.series)
    return result


@router.get("/climate/compare", response_model=ClimateMonthlyComparison | ClimateComparison)
def comparison(
    request: Request,
    location_ids: LocationIds,
    start: IsoDate,
    end: IsoDate,
    include_monthly: bool = False,
):
    if len(set(location_ids)) != len(location_ids):
        raise ApiError(422, "duplicate_locations", "Selecciona localidades distintas.")
    period = parse_period(start, end)
    validate_period(period, datetime.now(PERU).date())
    with request.app.state.sessions() as session:
        statement = select(Location.id).where(Location.id.in_(location_ids))
        if len(session.scalars(statement).all()) != len(location_ids):
            raise ApiError(404, "unknown_location", "Una de las localidades solicitadas no existe.")
    settings = request.app.state.settings
    series = load_series(request, period, location_ids)
    result = compare(series, settings)
    if include_monthly:
        groups = {item.location_id: summarize(item, "month", settings).groups for item in series}
        return ClimateMonthlyComparison(**result.model_dump(), monthly_groups=groups)
    return result


@router.get(
    "/climate/export",
    response_class=Response,
    responses={200: {"content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}}}},
)
def export(
    request: Request,
    location_id: LocationId,
    start: IsoDate,
    end: IsoDate,
    response_sha256: Annotated[str | None, Query(pattern=r"^[0-9a-f]{64}$")] = None,
    fetched_at: AwareDatetime | None = None,
):
    period = parse_period(start, end)
    if fetched_at is not None and response_sha256 is None:
        raise ApiError(
            422, "invalid_snapshot", "Indica el hash de la serie junto con la fecha de descarga."
        )
    result = load_series(request, period, [location_id], response_sha256, fetched_at)[0]
    filename = f"agronexa_{location_id}_{period.start}_{period.end}.csv"
    return Response(
        render_csv(result),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
