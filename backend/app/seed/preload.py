import argparse
import hashlib
import json
from datetime import UTC, date, datetime
from pathlib import Path

import httpx
from sqlalchemy import select

from app.core.config import ROOT, Settings
from app.core.errors import ApiError
from app.db.models import Location
from app.db.session import make_sessions
from app.schemas.climate import ClimateSeries, Period
from app.services.climate import PERU, get_series, validate_period
from app.services.csv_export import render_csv


def write_csv(path: Path, series: ClimateSeries) -> str:
    content = render_csv(series)
    path.write_bytes(content)
    return hashlib.sha256(content).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Descarga y documenta series reales de NASA POWER."
    )
    parser.add_argument("--location", action="append", help="ID de localidad; por defecto, todas.")
    parser.add_argument("--start", type=date.fromisoformat, default=date(2024, 1, 1))
    parser.add_argument("--end", type=date.fromisoformat, default=date(2024, 12, 31))
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "cache")
    args = parser.parse_args()
    period = Period(start=args.start, end=args.end)
    try:
        validate_period(period, datetime.now(PERU).date())
    except ApiError as exc:
        parser.error(exc.message)

    settings = Settings()
    sessions = make_sessions(settings.database_url)
    with sessions() as session:
        locations = args.location or list(
            session.scalars(select(Location.id).order_by(Location.id))
        )
    if not locations:
        parser.error("El catálogo está vacío. Ejecuta python -m app.seed.locations.")
    args.output.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    with httpx.Client(timeout=settings.nasa_timeout_seconds, follow_redirects=False) as client:
        for location in dict.fromkeys(locations):
            try:
                series = get_series(sessions, client, settings, location, period, force=True)
            except ApiError as exc:
                results.append(
                    {
                        "location_id": location,
                        "status": "error",
                        "http_status": exc.status,
                        "code": exc.code,
                        "message": exc.message,
                    }
                )
                continue
            path = args.output / f"{location}_{period.start}_{period.end}.csv"
            results.append(
                {
                    "location_id": location,
                    "status": "ok",
                    "csv": path.name,
                    "csv_sha256": write_csv(path, series),
                    "source": series.source.model_dump(mode="json"),
                    "units": series.units,
                    "quality": series.quality.model_dump(),
                    "warnings": series.warnings,
                    "sample": series.series[0].model_dump(mode="json"),
                }
            )

    manifest = {
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "period": period.model_dump(mode="json"),
        "results": results,
    }
    manifest_path = args.output / f"manifest_{period.start}_{period.end}.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(manifest_path.resolve())
    return int(any(result["status"] == "error" for result in results))


if __name__ == "__main__":
    raise SystemExit(main())
