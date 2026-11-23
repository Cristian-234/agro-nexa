import csv
import json
from io import StringIO

from app.schemas.climate import ClimateSeries

COLUMNS = (
    "date",
    "location_id",
    "t2m_deg_c",
    "t2m_min_deg_c",
    "t2m_max_deg_c",
    "prectotcorr_mm_day",
    "source",
    "fetched_at",
    "quality_flags",
)


def safe_text(value: str) -> str:
    if value.startswith(("\t", "\r", "\n")) or value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def render_csv(series: ClimateSeries) -> bytes:
    buffer = StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(COLUMNS)
    location = safe_text(series.location_id)
    source = safe_text(series.source.provider)
    fetched_at = series.source.fetched_at.isoformat()
    for row in series.series:
        writer.writerow(
            [
                row.date.isoformat(),
                location,
                row.t2m,
                row.t2m_min,
                row.t2m_max,
                row.prectotcorr,
                source,
                fetched_at,
                json.dumps(row.quality_flags, ensure_ascii=False, sort_keys=True),
            ]
        )
    return buffer.getvalue().encode("utf-8")
