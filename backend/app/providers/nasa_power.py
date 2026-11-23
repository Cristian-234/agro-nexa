import hashlib
import json
import math
import time
from dataclasses import dataclass
from datetime import UTC, date, datetime
from email.utils import parsedate_to_datetime

import httpx

from app.core.config import Settings
from app.core.errors import ApiError
from app.db.models import Location
from app.schemas.climate import Period

PROVIDER = "NASA POWER"
PRODUCT = "daily point"
TIME_STANDARD = "LST"
UNITS = {"T2M": "degC", "T2M_MIN": "degC", "T2M_MAX": "degC", "PRECTOTCORR": "mm/day"}
DESCRIPTIONS = {
    "T2M": "Temperatura media diaria del aire a 2 m",
    "T2M_MIN": "Temperatura mínima diaria del aire a 2 m",
    "T2M_MAX": "Temperatura máxima diaria del aire a 2 m",
    "PRECTOTCORR": "Precipitación diaria corregida",
}


@dataclass(frozen=True)
class Download:
    values: dict
    metadata: dict
    fill_value: float
    version: str
    resolution: str
    fetched_at: datetime
    response_hash: str


def retry_delay(response: httpx.Response, attempt: int) -> float:
    retry_after = response.headers.get("Retry-After")
    if retry_after:
        try:
            return min(5, max(0, int(retry_after)))
        except ValueError:
            try:
                until = parsedate_to_datetime(retry_after)
                return min(5, max(0, (until - datetime.now(UTC)).total_seconds()))
            except (ValueError, TypeError, OverflowError):
                pass
    return 0.5 * (2**attempt)


def invalid_response() -> ApiError:
    return ApiError(502, "nasa_invalid_response", "NASA POWER devolvió una respuesta no válida.")


def read_response(response: httpx.Response, params: dict) -> Download:
    if (
        not response.headers.get("content-type", "")
        .lower()
        .startswith(("application/json", "application/geo+json"))
    ):
        raise invalid_response()
    try:
        payload = response.json()
        header = payload["header"]
        geometry = payload["geometry"]
        values = payload["properties"]["parameter"]
        parameters = payload["parameters"]
        version = header["api"]["version"]
        fill = header["fill_value"]
        sources = header.get("sources", [])
        coordinates = geometry["coordinates"]
        if (
            payload["type"] != "Feature"
            or geometry["type"] != "Point"
            or not math.isclose(coordinates[0], params["longitude"], abs_tol=1e-5)
            or not math.isclose(coordinates[1], params["latitude"], abs_tol=1e-5)
            or header["time_standard"] != TIME_STANDARD
            or header["start"] != params["start"]
            or header["end"] != params["end"]
            or not isinstance(version, str)
            or not version
            or not isinstance(sources, list)
            or not all(isinstance(source, str) for source in sources)
            or len(version) + len(",".join(sources)) + 1 > 80
            or not isinstance(fill, (int, float))
            or isinstance(fill, bool)
            or not math.isfinite(fill)
            or not isinstance(values, dict)
            or not isinstance(parameters, dict)
        ):
            raise ValueError
        for code, unit in UNITS.items():
            if code in parameters:
                expected = {"C", "°C", "degC"} if unit == "degC" else {"mm/day"}
                if parameters[code]["units"] not in expected:
                    raise ValueError
            if code in values:
                if code not in parameters or not isinstance(values[code], dict):
                    raise ValueError
                for day in values[code]:
                    if len(day) != 8 or not day.isascii() or not day.isdigit():
                        raise ValueError
                    date.fromisoformat(day)
                    if not params["start"] <= day <= params["end"]:
                        raise ValueError
        # Verify that metadata can also be stored by engines with strict JSON support.
        metadata = {key: value for key, value in payload.items() if key != "properties"}
        metadata["properties"] = {
            key: value for key, value in payload["properties"].items() if key != "parameter"
        }
        metadata["request"] = params
        metadata["request_url"] = str(response.request.url)
        metadata["http_status"] = response.status_code
        json.dumps(metadata, allow_nan=False)
    except (ValueError, KeyError, IndexError, TypeError, OverflowError) as exc:
        raise invalid_response() from exc

    resolution = (
        "0,5° latitud × 0,625° longitud (malla meteorológica MERRA-2)"
        if "MERRA2" in sources
        else "Resolución sin confirmar para las fuentes declaradas en la respuesta"
    )
    return Download(
        values,
        metadata,
        fill,
        version,
        resolution,
        datetime.now(UTC),
        hashlib.sha256(response.content).hexdigest(),
    )


def fetch(client: httpx.Client, settings: Settings, location: Location, period: Period) -> Download:
    params = {
        "parameters": ",".join(UNITS),
        "community": "AG",
        "longitude": location.longitude,
        "latitude": location.latitude,
        "start": period.start.isoformat().replace("-", ""),
        "end": period.end.isoformat().replace("-", ""),
        "format": "JSON",
        "time-standard": TIME_STANDARD,
    }
    unavailable = ApiError(
        503, "nasa_unavailable", "NASA POWER no está disponible. Intenta de nuevo."
    )
    for attempt in range(3):
        try:
            response = client.get(settings.nasa_power_base_url, params=params)
        except httpx.TimeoutException as exc:
            if attempt == 2:
                raise ApiError(
                    504, "nasa_timeout", "NASA POWER excedió el tiempo de espera."
                ) from exc
            time.sleep(0.5 * (2**attempt))
        except httpx.RequestError as exc:
            raise unavailable from exc
        else:
            if response.status_code == 200:
                return read_response(response, params)
            if response.status_code == 429 or 500 <= response.status_code <= 599:
                if attempt == 2:
                    raise unavailable
                time.sleep(retry_delay(response, attempt))
            elif 400 <= response.status_code <= 499:
                raise unavailable
            else:
                raise invalid_response()
    raise unavailable
