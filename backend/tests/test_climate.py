from datetime import UTC, date, datetime, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text

from app.core.errors import ApiError
from app.db.models import FetchRun, Location, Observation, Variable
from app.main import create_app
from app.providers import nasa_power
from app.schemas.climate import Period
from app.services import climate

TEST_ID = "puno-ilave"
YEAR = Period(start=date(2024, 1, 1), end=date(2024, 12, 31))


def test_payload(request):
    """Fixture sintético TEST. Ningún dato de este objeto se publica o precarga."""
    query = request.url.params
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [
                float(query["longitude"]),
                float(query["latitude"]),
            ],
        },
        "header": {
            "api": {"version": "TEST"},
            "fill_value": -999,
            "time_standard": "LST",
            "start": query["start"],
            "end": query["end"],
        },
        "parameters": {
            "T2M": {"units": "C"},
            "T2M_MIN": {"units": "C"},
            "PRECTOTCORR": {"units": "mm/day"},
        },
        "properties": {
            "parameter": {
                "T2M": {"20240101": 10, "20240102": -999, "20240229": "NaN"},
                "T2M_MIN": {"20240101": 12},
                "PRECTOTCORR": {"20240101": 0, "20240102": -1},
            }
        },
    }


# Helper de fixture, no un caso de pytest.
test_payload.__test__ = False


def successful(request):
    return httpx.Response(200, json=test_payload(request))


def test_api_contract(settings, sessions, monkeypatch):
    def mocked_fetch(_client, settings, location, period):
        with httpx.Client(transport=httpx.MockTransport(successful)) as client:
            return nasa_power.fetch(client, settings, location, period)

    monkeypatch.setattr(climate, "fetch", mocked_fetch)
    with TestClient(create_app(settings)) as client:
        assert client.get("/health").json() == {"status": "ok", "database": "ok"}
        locations = client.get("/api/v1/locations").json()
        assert {location["id"] for location in locations} == {
            TEST_ID,
            "cusco-urubamba",
            "arequipa-chivay",
        }
        assert all(location["coordinate_source"] for location in locations)
        endpoint = "/api/v1/climate/series"
        params = {"location_id": TEST_ID, "start": "2024-01-01", "end": "2024-12-31"}
        response = client.get(endpoint, params=params)
        assert response.status_code == 200
        body = response.json()
        assert body["source"]["cache_status"] == "fresh"
        assert body["source"]["time_standard"] == "LST"
        assert body["source"]["fetched_at"].endswith("Z")
        assert body["quality"]["expected_days"] == 366
        assert body["quality"]["valid_days_by_variable"] == {
            "t2m": 1,
            "t2m_min": 1,
            "t2m_max": 0,
            "prectotcorr": 1,
        }
        first, second = body["series"][:2]
        assert first["prectotcorr"] == 0
        assert first["quality_flags"]["t2m"] == "mean_outside_temperature_bounds"
        assert first["quality_flags"]["t2m_max"] == "variable_missing"
        assert second["t2m"] is None and second["quality_flags"]["t2m"] == "fill_value"
        assert second["prectotcorr"] is None
        assert second["quality_flags"]["prectotcorr"] == "negative_precipitation"
        assert body["series"][59]["date"] == "2024-02-29"
        assert body["series"][59]["quality_flags"]["t2m"] == "invalid_value"
        assert body["series"][-1]["date"] == "2024-12-31"
        assert client.get(endpoint, params=params | {"location_id": "unknown"}).status_code == 404
        for overrides in (
            {"start": "2024-12-31", "end": "2024-01-01"},
            {"end": "9999-12-31"},
            {"start": "2010-01-01"},
            {"start": "2024-02-30"},
            {"start": "20240101"},
        ):
            invalid = client.get(endpoint, params=params | overrides)
            assert invalid.status_code == 422
            assert invalid.json()["code"] in {"invalid_input", "invalid_period"}


def test_reingestion_keeps_previous_valid_observation_and_exact_snapshot(settings, sessions):
    with httpx.Client(transport=httpx.MockTransport(successful)) as client:
        first = climate.get_series(sessions, client, settings, TEST_ID, YEAR)
        cached = climate.get_series(sessions, client, settings, TEST_ID, YEAR)
        assert cached.source.cache_status == "cached"
        assert cached.source.response_sha256 == first.source.response_sha256

    def all_missing(request):
        payload = test_payload(request)
        payload["properties"]["parameter"]["T2M"]["20240101"] = -999
        return httpx.Response(200, json=payload)

    with httpx.Client(transport=httpx.MockTransport(all_missing)) as client:
        refresh = climate.get_series(sessions, client, settings, TEST_ID, YEAR, force=True)
    assert refresh.series[0].t2m is None
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(Observation)) == 366 * 4
        assert session.scalar(select(func.count()).select_from(FetchRun)) == 2
        point = session.scalar(
            select(Observation)
            .join(Variable)
            .where(
                Variable.code == "T2M",
                Observation.date == date(2024, 1, 1),
            )
        )
        assert point.value == 10
        assert point.fetch_run_id == 1


@pytest.mark.parametrize(
    "scenario,status,attempts",
    [
        ("timeout", 504, 3),
        ("429", 503, 3),
        ("500", 503, 3),
        ("400", 503, 1),
        ("network", 503, 1),
        ("html", 502, 1),
        ("json", 502, 1),
        ("units", 502, 1),
    ],
)
def test_provider_failures(settings, sessions, monkeypatch, scenario, status, attempts):
    delays = []
    monkeypatch.setattr(nasa_power.time, "sleep", delays.append)
    calls = []

    def handler(request):
        calls.append(request)
        if scenario == "timeout":
            raise httpx.ReadTimeout("TEST", request=request)
        if scenario == "network":
            raise httpx.ConnectError("TEST", request=request)
        if scenario == "html":
            return httpx.Response(200, text="<html>TEST</html>")
        if scenario == "json":
            return httpx.Response(200, content=b"{", headers={"Content-Type": "application/json"})
        if scenario == "units":
            payload = test_payload(request)
            payload["parameters"]["T2M"]["units"] = "K"
            return httpx.Response(200, json=payload)
        return httpx.Response(int(scenario), headers={"Retry-After": "99"})

    with (
        httpx.Client(transport=httpx.MockTransport(handler)) as client,
        pytest.raises(ApiError) as err,
    ):
        climate.get_series(sessions, client, settings, TEST_ID, YEAR)
    assert err.value.status == status
    assert len(calls) == attempts
    assert len(delays) == attempts - 1 and all(delay <= 5 for delay in delays)
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(FetchRun)) == 0


def test_stale_cache(settings, sessions):
    with httpx.Client(transport=httpx.MockTransport(successful)) as client:
        original = climate.get_series(sessions, client, settings, TEST_ID, YEAR)
    with sessions.begin() as session:
        run = session.scalar(select(FetchRun))
        run.fetched_at = datetime.now(UTC) - timedelta(days=31)

    def offline(request):
        raise httpx.ConnectError("TEST", request=request)

    with httpx.Client(transport=httpx.MockTransport(offline)) as client:
        result = climate.get_series(sessions, client, settings, TEST_ID, YEAR)
    assert result.source.cache_status == "stale"
    assert result.source.cache_age_seconds >= 31 * 24 * 3600
    assert result.source.response_sha256 == original.source.response_sha256
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(FetchRun)) == 1
        assert session.scalar(text("PRAGMA foreign_keys")) == 1


def test_seed_and_coordinates(sessions):
    from sqlalchemy.exc import IntegrityError

    from app.seed.locations import seed

    assert seed(sessions) == 3
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(Location)) == 3
    with pytest.raises(IntegrityError), sessions.begin() as session:
        location = session.get(Location, TEST_ID)
        location.latitude = 91
