from datetime import date

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import select

from app.api.v1 import rotation as routes
from app.core.errors import ApiError
from app.db.agronomy import Rule
from app.main import create_app
from app.repositories.agronomy import insert_version
from app.schemas.climate import ClimateSeries
from app.schemas.rotation import CatalogRule, CatalogVersion

# Todos los predicados y valores de este módulo son fixtures sintéticos TEST.
INPUT = {
    "location_id": "puno-ilave",
    "start": "2024-01-01",
    "end": "2024-01-02",
    "previous_crop": "potato",
    "candidate_crops": ["quinoa", "potato"],
    "irrigation": "available",
    "soil_texture": "unknown",
    "soil_ph": None,
    "soil_notes": "Nota TEST privada",
    "priorities": ["water"],
}
URL = "/api/v1/rotations/evaluate"
REVIEWED = date(2024, 1, 3)


def rule(id="test-rule", crop="quinoa", **overrides):
    return CatalogRule.model_validate(
        {
            "id": id,
            "crop_id": crop,
            "criterion": "TEST disponibilidad",
            "weight": 1,
            "critical": False,
            "predicate": {
                "variable": "irrigation",
                "operator": "eq",
                "threshold": "available",
                "temporal_scope": "recorded_profile",
            },
            "regions": ["Puno"],
            "geographic_context": "Contexto TEST",
            "source": {
                "url": "https://example.test/",
                "title": "Fuente TEST",
                "section": "TEST sección",
            },
            "status": "approved",
            "reviewed_on": REVIEWED,
            "limitation": "Límite TEST",
        }
        | overrides
    )


def publish(sessions, *rules, version="TEST-v1", status="approved", reviewed_on=REVIEWED):
    with sessions.begin() as session:
        insert_version(
            session,
            CatalogVersion(
                version=version,
                status=status,
                reviewed_on=reviewed_on,
                rules=list(rules),
            ),
        )


@pytest.fixture
def client(settings, sessions):
    settings.min_rule_coverage = 0.8
    settings.min_data_coverage = 0.9
    with TestClient(create_app(settings)) as client:
        yield client


def evaluate(client, **data):
    response = client.post(URL, json=INPUT | data)
    assert response.status_code == 200, response.text
    return response.json()


def test_unapproved_catalog_abstains_and_ficha_is_private(client, sessions, monkeypatch):
    def unexpected(*args, **kwargs):
        pytest.fail("No corresponde consultar NASA sin reglas activas.")

    monkeypatch.setattr(routes, "get_series", unexpected)
    publish(sessions, rule(), status="reviewed")
    crops = client.get("/api/v1/crops").json()
    assert [crop["name_es"] for crop in crops] == ["Papa", "Quinua"]
    assert all(crop["source_url"].startswith("https://repositorio.inia.gob.pe/") for crop in crops)
    response = client.post(URL, json=INPUT)
    assert response.headers["Cache-Control"] == "no-store"
    assert "Nota TEST privada" not in response.text
    body = response.json()
    assert body["rule_set_version"] is None and body["climate_source"] is None
    for result in body["alternatives"]:
        assert (result["state"], result["score"], result["rank"]) == (
            "insufficient_evidence",
            None,
            None,
        )
        assert result["evidence_coverage"] == 0 and result["criteria"] == []
        assert "aprobadas" in result["warnings"][0]


def test_critical_missing_fail_and_not_applicable(client, sessions):
    ph = {
        "variable": "soil_ph",
        "operator": "between",
        "threshold": [5, 7],
        "unit": "pH",
        "temporal_scope": "recorded_profile",
    }
    publish(
        sessions,
        rule("test-ph", critical=True, criterion="TEST suelo", predicate=ph),
        rule("test-geography", critical=True, regions=["Cusco"], weight=100),
        rule("test-rotation", critical=True, previous_crop_id="quinoa", weight=100),
        rule("test-water", weight=10),
        rule("test-draft", critical=True, status="draft", reviewed_on=None),
    )
    candidate = ["quinoa"]
    result = evaluate(client, candidate_crops=candidate)["alternatives"][0]
    assert result["state"] == "insufficient_evidence" and result["score"] is None
    assert result["evidence_coverage"] == pytest.approx(10 / 11)
    items = {item["rule_id"]: item for item in result["criteria"]}
    assert "test-draft" not in items
    assert items["test-ph"]["state"] == "unknown" and items["test-ph"]["value"] is None
    assert items["test-geography"]["state"] == "not_applicable"
    assert items["test-rotation"]["state"] == "not_applicable"
    assert items["test-ph"]["source"]["section"] == "TEST sección"
    assert (
        items["test-water"]["state"] == "pass" and items["test-water"]["evidence_origin"] == "ficha"
    )

    result = evaluate(client, candidate_crops=candidate, soil_ph=0)["alternatives"][0]
    assert result["state"] == "restriction_detected" and result["score"] is None
    assert result["criteria"][1]["value"] == 0
    result = evaluate(client, candidate_crops=candidate, soil_ph=5)["alternatives"][0]
    assert result["state"] == "exploratory_comparison" and result["score"] == 100
    result = evaluate(client, candidate_crops=candidate, previous_crop="unknown", soil_ph=5)[
        "alternatives"
    ][0]
    assert result["state"] == "insufficient_evidence"
    assert result["criteria"][2]["state"] == "unknown"


def test_coverage_weighting_order_tie_and_incompatible_schemes(client, sessions):
    texture = {
        "variable": "soil_texture",
        "operator": "eq",
        "threshold": "loam",
        "temporal_scope": "recorded_profile",
    }
    irrigation = {
        "variable": "irrigation",
        "operator": "eq",
        "threshold": "none",
        "temporal_scope": "recorded_profile",
    }
    publish(
        sessions,
        rule("test-a", weight=4),
        rule("test-b", "potato", weight=4),
        rule("test-c", weight=1, predicate=texture),
        rule("test-d", "potato", weight=1, predicate=texture),
    )
    tie = evaluate(client)
    assert [(a["crop_id"], a["score"], a["rank"]) for a in tie["alternatives"]] == [
        ("quinoa", 100, 1),
        ("potato", 100, 1),
    ]
    assert all(a["evidence_coverage"] == 0.8 for a in tie["alternatives"])

    publish(
        sessions,
        rule("test-a", predicate=irrigation),
        rule("test-b", "potato"),
        version="TEST-v2",
        reviewed_on=date(2024, 1, 4),
    )
    assert [(a["crop_id"], a["score"], a["rank"]) for a in evaluate(client)["alternatives"]] == [
        ("potato", 100, 1),
        ("quinoa", 0, 2),
    ]

    publish(
        sessions,
        rule("test-a", criterion="TEST criterio diferente"),
        rule("test-b", "potato"),
        version="TEST-v3",
        reviewed_on=date(2024, 1, 5),
    )
    distinct = evaluate(client)
    assert all(a["rank"] is None for a in distinct["alternatives"])
    assert any("criterios distintos" in warning for warning in distinct["warnings"])


def test_below_threshold_and_invalid_catalog_fail_closed(client, sessions):
    ph = {
        "variable": "soil_ph",
        "operator": "gte",
        "threshold": 5,
        "unit": "pH",
        "temporal_scope": "recorded_profile",
    }
    publish(sessions, rule("test-a", weight=3), rule("test-b", weight=1, predicate=ph))
    partial = evaluate(client, candidate_crops=["quinoa"])["alternatives"][0]
    assert partial["evidence_coverage"] == 0.75 and partial["score"] is None
    with pytest.raises(ValidationError):
        rule(weight=0)
    with pytest.raises(ValidationError):
        rule(weight=float("inf"))
    with sessions.begin() as session:
        record = session.scalar(select(Rule).where(Rule.id == "test-a"))
        record.predicate_json = {"variable": "invalid-test"}
    result = evaluate(client)
    assert result["rule_set_version"] is None
    assert all(
        a["state"] == "insufficient_evidence" and a["score"] is None for a in result["alternatives"]
    )


@pytest.mark.parametrize("mode", ["complete", "partial", "stale", "unavailable"])
def test_climate_evidence_requires_complete_nonstale_rain(client, sessions, monkeypatch, mode):
    rain = {
        "variable": "accumulated_precipitation",
        "operator": "gte",
        "threshold": 0,
        "unit": "mm",
        "temporal_scope": "reference_period",
    }
    publish(sessions, rule(critical=True, predicate=rain))

    def sample(*args):
        if mode == "unavailable":
            raise ApiError(504, "nasa_timeout", "TEST")
        return ClimateSeries.model_validate(
            {
                "location_id": INPUT["location_id"],
                "period": {"start": INPUT["start"], "end": INPUT["end"]},
                "series": [
                    {
                        "date": day,
                        "t2m": 10,
                        "t2m_min": 1,
                        "t2m_max": 20,
                        "prectotcorr": value,
                        "quality_flags": {},
                    }
                    for day, value in [
                        (INPUT["start"], 0),
                        (INPUT["end"], None if mode == "partial" else 2),
                    ]
                ],
                "source": {
                    "provider": "NASA POWER",
                    "product": "TEST",
                    "version": "TEST",
                    "fetched_at": "2024-01-03T00:00:00Z",
                    "cache_age_seconds": 1,
                    "cache_status": "stale" if mode == "stale" else "cached",
                    "time_standard": "LST",
                    "resolution": "TEST",
                    "documentation_url": "https://example.test",
                    "response_sha256": "test",
                    "metadata": {},
                },
                "quality": {
                    "expected_days": 2,
                    "valid_days_by_variable": {},
                    "coverage_pct_by_variable": {},
                },
                "warnings": [],
                "units": {},
            }
        )

    monkeypatch.setattr(routes, "get_series", sample)
    response = evaluate(client, candidate_crops=["quinoa"])
    candidate = response["alternatives"][0]
    if mode == "complete":
        assert candidate["score"] == 100 and candidate["criteria"][0]["value"] == 2
    else:
        assert candidate["score"] is None and candidate["criteria"][0]["state"] == "unknown"
        assert candidate["state"] == "insufficient_evidence"
    if mode == "partial":
        assert candidate["criteria"][0]["evidence_coverage"] == 0.5
    if mode == "stale":
        assert response["climate_source"]["cache_status"] == "stale"


@pytest.mark.parametrize(
    "update,status",
    [
        ({"soil_ph": 14.1}, 422),
        ({"soil_ph": True}, 422),
        ({"soil_notes": "x" * 501}, 422),
        ({"start": "2024-01-03"}, 422),
        ({"start": 0}, 422),
        ({"end": "9999-01-01"}, 422),
        ({"candidate_crops": []}, 422),
        ({"candidate_crops": ["quinoa", "quinoa"]}, 422),
        ({"priorities": ["water", "water"]}, 422),
        ({"location_id": "unknown"}, 404),
    ],
)
def test_ficha_validates_requests(client, update, status):
    assert client.post(URL, json=INPUT | update).status_code == status
