import csv
from datetime import date, timedelta
from io import StringIO

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.providers import nasa_power
from app.services import climate
from app.services.csv_export import safe_text

A, B, C = "puno-ilave", "cusco-urubamba", "arequipa-chivay"
START, END = "2023-12-30", "2024-01-02"
SUMMARY, COMPARE = "/api/v1/climate/summary", "/api/v1/climate/compare"

# Fixture TEST de cuatro días, exclusivo para las pruebas.
VALUES = {
    A: [[10, None, 14, 50], [0, -1, 2, 3], [20, 30, None, 40], [0, 1, 2.5, 3]],
    B: [[8, 100, 10, None], [1, 2, 3, 4], [20, 30, 40, 100], [2, 1, 0, 4]],
    C: [[None] * 4, [None] * 4, [None] * 4, [0, None, 0, None]],
}


@pytest.fixture
def api(settings, sessions, monkeypatch):
    calls = []
    settings.min_data_coverage = 0.9
    settings.rain_day_threshold_mm = 1

    def mock_fetch(_client, settings, location, period):
        calls.append(location.id)
        start = date.fromisoformat(START)
        dates = [(start + timedelta(days=i)).isoformat().replace("-", "") for i in range(4)]

        def response(request):
            params = request.url.params
            values = {
                code: {
                    day: value
                    for day, value in zip(dates, values, strict=True)
                    if value is not None and params["start"] <= day <= params["end"]
                }
                for code, values in zip(nasa_power.UNITS, VALUES[location.id], strict=True)
            }
            return httpx.Response(
                200,
                json={
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [location.longitude, location.latitude],
                    },
                    "header": {
                        "api": {"version": "TEST"},
                        "fill_value": -999,
                        "time_standard": "LST",
                        "start": params["start"],
                        "end": params["end"],
                        "sources": ["MERRA2"],
                    },
                    "parameters": {
                        code: {"units": unit} for code, unit in nasa_power.UNITS.items()
                    },
                    "properties": {"parameter": values},
                },
            )

        with httpx.Client(transport=httpx.MockTransport(response)) as client:
            return nasa_power.fetch(client, settings, location, period)

    monkeypatch.setattr(climate, "fetch", mock_fetch)
    with TestClient(create_app(settings)) as client:
        yield client, settings, calls


def summary(client, location_id=A, **kwargs):
    return client.get(
        SUMMARY, params={"location_id": location_id, "start": START, "end": END, **kwargs}
    )


def compare(client, *locations, **kwargs):
    return client.get(
        COMPARE, params={"location_ids": locations, "start": START, "end": END, **kwargs}
    )


def test_summary_values_status_and_provenance(api):
    client, settings, _ = api
    settings.rain_day_threshold_mm = 2.5
    response = summary(client)
    assert response.status_code == 200
    body = response.json()
    assert body["source"]["provider"] == "NASA POWER"
    assert body["source"]["cache_status"] == "fresh"
    assert body["rain_day_threshold_mm"] == 2.5
    assert body["min_coverage_pct"] == 90
    values = body["groups"][0]["indicators"]
    assert values["mean_temperature"] == {
        "value": 24.7,
        "unit": "degC",
        "valid_days": 3,
        "expected_days": 4,
        "coverage_pct": 75,
        "status": "insufficient",
    }
    assert values["min_temperature"]["value"] == -1
    assert values["max_temperature"]["value"] == 40
    assert values["accumulated_precipitation"] == {
        "value": 6.5,
        "unit": "mm",
        "valid_days": 4,
        "expected_days": 4,
        "coverage_pct": 100,
        "status": "complete",
    }
    assert values["potential_frost_days"]["value"] == 2
    assert values["rainy_days"]["value"] == 2

    group = summary(client, C).json()["groups"][0]
    assert group["indicators"]["accumulated_precipitation"]["status"] == "partial"
    assert group["indicators"]["accumulated_precipitation"]["value"] == 0
    assert group["indicators"]["mean_temperature"]["status"] == "no_data"
    assert group["indicators"]["mean_temperature"]["value"] is None
    assert any("acumulado observado parcial" in warning for warning in group["warnings"])


@pytest.mark.parametrize("group_by", ["month", "year"])
def test_summary_groups_use_inclusive_requested_days(api, group_by):
    client, _, _ = api
    result = summary(client, group_by=group_by).json()
    assert [group["period"] for group in result["groups"]] == [
        {"start": "2023-12-30", "end": "2023-12-31"},
        {"start": "2024-01-01", "end": "2024-01-02"},
    ]
    assert [
        group["indicators"]["mean_temperature"]["expected_days"] for group in result["groups"]
    ] == [2, 2]
    assert [group["indicators"]["mean_temperature"]["value"] for group in result["groups"]] == [
        10,
        32,
    ]


def test_comparison_aligns_days_and_guards_total_precipitation(api):
    client, settings, _ = api
    settings.min_data_coverage = 0.5
    response = compare(client, A, B)
    assert response.status_code == 200
    body = response.json()
    assert body["aligned_period"] == {"start": START, "end": END}
    assert [item["location_id"] for item in body["locations"]] == [A, B]
    assert all(item["source"]["time_standard"] == "LST" for item in body["locations"])
    pair = body["comparisons"][0]
    assert pair["differences"]["mean_temperature"] == {
        "value": 3.0,
        "unit": "degC",
        "method": "common_valid_days",
        "status": "available",
        "common_valid_days": 2,
        "common_coverage_pct": 50,
    }
    assert pair["differences"]["max_temperature"]["value"] == -60
    assert pair["differences"]["accumulated_precipitation"]["value"] == -0.5
    assert any("t2m difieren" in warning for warning in pair["warnings"])

    body = compare(client, C, B, A).json()
    assert [(pair["location_a"], pair["location_b"]) for pair in body["comparisons"]] == [
        (C, B),
        (C, A),
        (B, A),
    ]
    assert body["comparisons"][-1]["differences"]["mean_temperature"]["value"] == -3
    for pair in body["comparisons"]:
        total = pair["differences"]["accumulated_precipitation"]
        assert total["value"] is None and total["status"] == "incomplete_precipitation"
    assert any("todas las localidades" in warning for warning in body["warnings"])


def test_common_coverage_threshold_is_applied_to_unrounded_fraction(api):
    client, settings, _ = api
    settings.min_data_coverage = 0.5001
    difference = compare(client, A, B).json()["comparisons"][0]["differences"]["mean_temperature"]
    assert difference["status"] == "insufficient"
    assert difference["value"] is None
    assert difference["common_coverage_pct"] == 50


def test_invalid_parameters_are_rejected_before_provider_io(api):
    client, _, calls = api
    for selection in [(A,), (A, A), (A, B, C, A), (A, "Invalid!"), (A, "")]:
        assert compare(client, *selection).status_code == 422
    assert compare(client, A, "unknown").status_code == 404
    assert compare(client, A, B, start="2000-01-01").status_code == 422
    assert summary(client, group_by="week").status_code == 422
    assert summary(client, start="2024-02-30").status_code == 422
    assert calls == []


def test_chart_payloads_share_the_aggregate_snapshot(api):
    client, _, calls = api
    exploration = summary(client, include_series=True).json()
    assert [row["date"] for row in exploration["series"]] == [
        "2023-12-30",
        "2023-12-31",
        "2024-01-01",
        "2024-01-02",
    ]
    assert exploration["series"][1]["t2m"] is None
    assert "series" not in summary(client).json()
    comparison = compare(client, A, B, include_monthly=True).json()
    assert list(comparison["monthly_groups"]) == [A, B]
    assert comparison["monthly_groups"][A][0]["period"] == {
        "start": "2023-12-30",
        "end": "2023-12-31",
    }
    assert comparison["monthly_groups"][B][1]["indicators"]["mean_temperature"]["value"] == 10
    assert "monthly_groups" not in compare(client, A, B).json()
    assert calls == [A, B]


def test_csv_preserves_missing_and_valid_zero_with_pinned_provenance(api):
    client, _, calls = api
    source = summary(client, include_series=True).json()["source"]
    path = "/api/v1/climate/export"
    params = {"location_id": A, "start": START, "end": END}
    exported = client.get(
        path,
        params=params
        | {
            "response_sha256": source["response_sha256"],
            "fetched_at": source["fetched_at"],
        },
    )
    assert exported.status_code == 200
    assert exported.headers["content-type"] == "text/csv; charset=utf-8"
    assert (
        exported.headers["content-disposition"]
        == f'attachment; filename="agronexa_{A}_{START}_{END}.csv"'
    )
    reader = csv.DictReader(StringIO(exported.content.decode("utf-8")))
    assert reader.fieldnames == [
        "date",
        "location_id",
        "t2m_deg_c",
        "t2m_min_deg_c",
        "t2m_max_deg_c",
        "prectotcorr_mm_day",
        "source",
        "fetched_at",
        "quality_flags",
    ]
    rows = list(reader)
    assert len(rows) == 4
    assert rows[0]["source"] == "NASA POWER"
    assert rows[0]["fetched_at"] == source["fetched_at"].replace("Z", "+00:00")
    assert rows[0]["prectotcorr_mm_day"] == "0.0"
    assert rows[1]["t2m_deg_c"] == ""
    assert rows[1]["quality_flags"] == '{"t2m": "day_missing"}'
    assert rows[1]["t2m_min_deg_c"] == "-1.0"
    assert client.get(path, params=params).content == exported.content
    assert client.get(path, params=params | {"response_sha256": "0" * 64}).status_code == 404
    assert client.get(path, params=params | {"response_sha256": "bad"}).status_code == 422
    assert client.get(path, params=params | {"fetched_at": source["fetched_at"]}).status_code == 422
    assert (
        client.get(
            path,
            params=params
            | {
                "response_sha256": source["response_sha256"],
                "fetched_at": "2024-01-01T00:00:00Z",
            },
        ).status_code
        == 404
    )
    assert calls == [A]


@pytest.mark.parametrize("value", ["=TEST", "+TEST", "-TEST", "  @TEST", "\tTEST", "\nTEST"])
def test_csv_neutralizes_formula_like_text(value):
    assert safe_text(value) == "'" + value
