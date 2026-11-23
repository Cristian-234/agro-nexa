import hashlib
import json
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Literal

import httpx

from app.core.config import NASA_DOCS, Settings
from app.core.errors import ApiError
from app.db.models import Dataset, Location
from app.providers.nasa_power import PRODUCT, PROVIDER, TIME_STANDARD, UNITS, fetch
from app.repositories.climate import latest_run, save_run
from app.schemas.climate import ClimateSeries, Period
from app.services.quality import normalize

# Perú continental observa UTC-05:00 todo el año.
PERU = timezone(timedelta(hours=-5))


def validate_period(period: Period, today: date) -> None:
    if period.end > today or not 1 <= (period.end - period.start).days + 1 <= 3660:
        raise ApiError(
            422,
            "invalid_period",
            "El periodo debe incluir entre 1 y 3660 días y no acabar en el futuro.",
        )


def get_series(
    sessions,
    client: httpx.Client,
    settings: Settings,
    location_id: str,
    period: Period,
    *,
    force: bool = False,
    response_hash: str | None = None,
    snapshot_fetched_at: datetime | None = None,
) -> ClimateSeries:
    today = datetime.now(PERU).date()
    validate_period(period, today)
    with sessions() as session:
        location = session.get(Location, location_id)
        if location is None:
            raise ApiError(404, "unknown_location", "La localidad solicitada no existe.")
        session.expunge(location)

    key_parts = [
        settings.nasa_power_base_url,
        PROVIDER,
        PRODUCT,
        "AG",
        location.id,
        location.latitude,
        location.longitude,
        list(UNITS),
        TIME_STANDARD,
        period.start.isoformat(),
        period.end.isoformat(),
    ]
    key = hashlib.sha256(json.dumps(key_parts).encode()).hexdigest()
    with sessions() as session:
        cached = latest_run(session, key, response_hash, snapshot_fetched_at)
    ttl = (
        settings.recent_cache_ttl_hours
        if (today - period.end).days <= 30
        else settings.cache_ttl_hours
    )
    cache_status: Literal["fresh", "cached", "stale"]
    if response_hash is not None:
        if cached is None:
            raise ApiError(
                404,
                "unknown_snapshot",
                "La serie guardada ya no está disponible. Vuelve a consultar.",
            )
        run = cached
        cache_status = "cached" if age(run.fetched_at) < ttl * 3600 else "stale"
    elif cached is not None and not force and age(cached.fetched_at) < ttl * 3600:
        run, cache_status = cached, "cached"
    else:
        try:
            download = fetch(client, settings, location, period)
        except ApiError:
            if cached is None or force:
                raise
            run, cache_status = cached, "stale"
        else:
            rows = normalize(download, period)
            with sessions.begin() as session:
                run = save_run(session, location, period, key, download, rows)
            cache_status = "fresh"
    with sessions() as session:
        dataset = session.get(Dataset, run.dataset_id)
        resolution = dataset.resolution_text

    units = {code.lower(): unit for code, unit in UNITS.items()}
    count = len(run.snapshot)
    valid = {code: sum(row[code] is not None for row in run.snapshot) for code in units}
    coverage = {code: 100 * total / count for code, total in valid.items()}
    warnings = ["La serie representa una celda de NASA POWER. LST es tiempo solar local."]
    if not location.verified:
        warnings.append("La coordenada de consulta es preliminar.")
    if cache_status == "stale" and response_hash is None:
        warnings.append(
            "NASA POWER no pudo actualizar la consulta. Se muestran datos de caché antigua."
        )
    if min(valid.values()) / count < settings.min_data_coverage:
        warnings.append("Al menos una variable tiene cobertura por debajo del umbral configurado.")
    if valid["prectotcorr"] < count:
        warnings.append("La precipitación tiene días faltantes.")
    if not any(valid.values()):
        warnings.append("NASA POWER no aportó observaciones válidas para este periodo.")
    if min(valid.values()) < count and (today - period.end).days <= 30:
        warnings.append("Los días recientes faltantes pueden deberse al retraso de publicación.")
    return ClimateSeries.model_validate(
        {
            "location_id": location_id,
            "period": period,
            "source": {
                "provider": PROVIDER,
                "product": PRODUCT,
                "version": run.metadata_json["header"]["api"]["version"],
                "fetched_at": run.fetched_at.replace(tzinfo=UTC)
                if run.fetched_at.tzinfo is None
                else run.fetched_at.astimezone(UTC),
                "cache_status": cache_status,
                "cache_age_seconds": age(run.fetched_at),
                "time_standard": TIME_STANDARD,
                "resolution": resolution,
                "documentation_url": NASA_DOCS,
                "response_sha256": run.response_hash,
                "metadata": run.metadata_json,
            },
            "units": units,
            "series": run.snapshot,
            "quality": {
                "expected_days": count,
                "valid_days_by_variable": valid,
                "coverage_pct_by_variable": coverage,
            },
            "warnings": warnings,
        }
    )


def age(fetched_at: datetime) -> int:
    if fetched_at.tzinfo is None:  # SQLite returns naive timestamps stored in UTC.
        fetched_at = fetched_at.replace(tzinfo=UTC)
    return max(0, int((datetime.now(UTC) - fetched_at).total_seconds()))
