from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db.agronomy import BibliographicReference, RuleSet
from app.domain.preliminary import evaluate_criterion
from app.main import create_app
from app.schemas.preliminary import PreliminaryInput, Reference

# Synthetic inputs for contract and boundary tests only.
SCOPE = {"location_id": "puno-ilave", "previous_crop": "potato", "candidate_crop": "quinoa"}
ILLPA = {"cultivar": "illpa_inia", "soil_ph_date": date(2024, 6, 1), "soil_ph_method": "TEST"}
VERSION = "illpa-inia-ilave-v2"


def evaluate(sessions, criterion, **fields):
    with sessions() as session:
        reference = Reference.model_validate(
            session.get(BibliographicReference, (VERSION, criterion))
        )
    return evaluate_criterion(reference, PreliminaryInput(**SCOPE, **fields))


@pytest.mark.parametrize(
    ("ph", "expected"),
    [
        (5.49, "outside_reference"),
        (5.5, "matches_reference"),
        (6.7, "matches_reference"),
        (8, "matches_reference"),
        (8.01, "outside_reference"),
        (None, "insufficient_information"),
    ],
)
def test_ph_boundaries_and_missing(sessions, ph, expected):
    criterion = evaluate(sessions, "ph", soil_ph=ph, **ILLPA)
    assert criterion.state == expected
    assert criterion.entered_value == {"soil_ph": ph, "date": "2024-06-01", "method": "TEST"}


@pytest.mark.parametrize(
    ("cultivar", "day"), [("other", "2024-06-01"), ("unknown", "2024-06-01"), ("illpa_inia", None)]
)
def test_ph_requires_illpa_and_a_date(sessions, cultivar, day):
    criterion = evaluate(
        sessions, "ph", cultivar=cultivar, soil_ph=7, soil_ph_date=day, soil_ph_method="TEST"
    )
    assert criterion.state == "insufficient_information"
    assert criterion.pending_data


def test_ph_requires_declared_method(sessions):
    result = evaluate(sessions, "ph", cultivar="illpa_inia", soil_ph=7, soil_ph_date="2024-01-01")
    assert result.state == "insufficient_information"
    assert any("método" in item for item in result.pending_data)


@pytest.mark.parametrize(
    ("texture", "expected"),
    [
        ("loam", "matches_reference"),
        ("sandy_loam", "matches_reference"),
        ("clay", "outside_reference"),
        ("unknown", "insufficient_information"),
    ],
)
def test_texture_uses_documented_classes_without_inferring_drainage(sessions, texture, expected):
    assert (
        evaluate(sessions, "texture", soil_texture=texture, drainage="good", **ILLPA).state
        == expected
    )
    drainage = evaluate(sessions, "drainage", soil_texture=texture, **ILLPA)
    assert drainage.state == "insufficient_information"
    assert drainage.entered_value == {"drainage": "unknown"}


def test_texture_needs_independent_drainage_record(sessions):
    result = evaluate(sessions, "texture", soil_texture="loam", **ILLPA)
    assert result.state == "insufficient_information"
    assert any("drenaje" in item for item in result.pending_data)


@pytest.mark.parametrize(
    ("drainage", "flooding"), [("poor", "no"), ("waterlogging", "no"), ("unknown", "yes")]
)
def test_drainage_reports_declared_risk_without_an_approved_restriction(
    sessions, drainage, flooding
):
    result = evaluate(sessions, "drainage", drainage=drainage, flooding_history=flooding)
    assert result.state == "insufficient_information"
    assert result.entered_value == {"drainage": drainage, "flooding_history": flooding}
    assert "Revisar esta condición en campo" in result.explanation


def test_other_cultivar_texture_has_no_comparison(sessions):
    assert (
        evaluate(sessions, "texture", cultivar="other", soil_texture="loam", drainage="good").state
        == "insufficient_information"
    )


@pytest.mark.parametrize(
    "moisture",
    [
        {"kind": "unknown"},
        {"kind": "observed", "date": "2024-11-05", "condition": "moist", "method": "TEST"},
        {"kind": "measured", "date": "2024-11-05", "value": 0, "unit": "% v/v"},
    ],
)
def test_humidity_evidence_is_distinct_from_irrigation(sessions, moisture):
    criterion = evaluate(
        sessions, "moisture", irrigation="available", establishment_moisture=moisture
    )
    assert criterion.state == "insufficient_information"
    assert criterion.entered_value == {"irrigation": "available", **moisture}


def test_partial_moisture_keeps_known_condition(sessions):
    result = evaluate(
        sessions,
        "moisture",
        establishment_moisture={
            "kind": "observed",
            "condition": "moist",
            "date": None,
        },
    )
    assert result.state == "insufficient_information"
    assert result.entered_value["condition"] == "moist"
    assert any("fecha" in item for item in result.pending_data)


@pytest.mark.parametrize(
    ("cultivar", "history", "state"),
    [
        ("illpa_inia", [], "insufficient_information"),
        ("illpa_inia", [{"crop": "potato"}], "insufficient_information"),
        ("unknown", [{"crop": "potato", "harvest_date": "2024-05-12"}], "insufficient_information"),
        ("illpa_inia", [{"crop": "potato", "harvest_date": "2024-05-12"}], "matches_reference"),
        (
            "illpa_inia",
            [
                {"crop": "other", "harvest_date": "2024-05-12"},
                {"crop": "potato", "harvest_date": "2023-05-12"},
            ],
            "outside_reference",
        ),
        (
            "illpa_inia",
            [
                {"crop": "unknown"},
                {"crop": "potato", "harvest_date": "2023-05-12"},
            ],
            "insufficient_information",
        ),
    ],
)
def test_sequence_uses_only_the_documented_immediate_harvest(sessions, cultivar, history, state):
    assert evaluate(sessions, "sequence", cultivar=cultivar, lot_history=history).state == state


def test_catalog_and_preliminary_api_leave_approved_assessment_unchanged(settings, sessions):
    with TestClient(create_app(settings)) as client:
        response = client.get("/api/v1/rotations/references")
        assert response.status_code == 200
        references = {item["id"]: item for item in response.json()}
        assert len(references) == 7
        assert all(
            item["version"] == VERSION and item["source_section"] and item["scope"]
            for item in references.values()
        )
        assert references["ph"]["value"] == [5.5, 8.0]
        assert references["ph"]["unit"] == "pH"
        assert references["ph"]["source_year"] == 2013
        assert references["drainage"]["source_year"] == 2018
        assert all(
            ref["verification"] == "verified_in_primary_source" for ref in references.values()
        )
        assert all(
            ref["source_issuer"]
            and ref["location_id"] == "puno-ilave"
            and ref["cultivar"] == "illpa_inia"
            for ref in references.values()
        )
        assert {
            key for key, ref in references.items() if ref["criterion_type"] == "candidate_rule"
        } == {"sequence", "ph", "texture"}
        assert references["moisture"]["criterion_type"] == "not_evaluable"
        assert "8. Tipos de suelos" in references["drainage"]["source_section"]
        assert (
            references["ph"]["source_url"]
            == "https://repositorio.inia.gob.pe/handle/20.500.12955/79"
        )

    # Read again through an independent app with a fresh connection pool.
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/v1/rotations/preliminary", json=SCOPE)
        assert response.status_code == 200
        assert response.headers["Cache-Control"] == "no-store"
        result = response.json()
        assert set(result) == {"location_id", "cultivar", "version", "criteria", "plot_context"}
        criteria = {item["reference"]["id"]: item for item in result["criteria"]}
        assert {key: row["reference"] for key, row in criteria.items()} == references
        assert criteria["sequence"]["state"] == "insufficient_information"
        assert criteria["sequence"]["entered_value"] == {
            "previous_crop": "potato",
            "candidate_crop": "quinoa",
        }
        for key, value, unit in [
            ("precipitation", [450, 600], "mm"),
            ("temperature", [4, 15], "°C"),
        ]:
            assert references[key]["value"] == value
            assert references[key]["criterion_type"] == "documentary_reference"
            assert references[key]["unit"] == unit
            assert criteria[key]["entered_value"] is None
            assert criteria[key]["state"] == "insufficient_information"
            assert "periodo" in criteria[key]["pending_data"][0]
        legacy = client.post(
            "/api/v1/rotations/evaluate",
            json={
                "location_id": "puno-ilave",
                "start": "2024-01-01",
                "end": "2024-12-31",
                "previous_crop": "potato",
                "candidate_crops": ["quinoa"],
                "irrigation": "unknown",
            },
        )
        assert legacy.status_code == 200
        alternative = legacy.json()["alternatives"][0]
        assert alternative["state"] == "insufficient_evidence"
        assert alternative["score"] is None and alternative["rank"] is None
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(RuleSet)) == 0
        assert session.get(BibliographicReference, ("illpa-inia-ilave-v1", "ph")) is not None


def test_api_returns_declared_lot_context_and_history(settings, sessions):
    history = [{"crop": "potato", "harvest_date": "2024-05-01"}]
    context = {
        "planned_sowing_date": "2024-10-01",
        "position": "slope",
        "elevation_m": 3800,
        "agrochemical_history": "TEST",
    }
    with TestClient(create_app(settings)) as client:
        response = client.post(
            "/api/v1/rotations/preliminary",
            json={
                **SCOPE,
                "cultivar": "illpa_inia",
                "lot_history": history,
                "plot_context": context,
            },
        )
    assert response.status_code == 200
    result = response.json()
    assert result["plot_context"] == context
    sequence = next(item for item in result["criteria"] if item["reference"]["id"] == "sequence")
    assert sequence["entered_value"]["lot_history"] == history
    assert sequence["state"] == "matches_reference"


@pytest.mark.parametrize(
    "fields",
    [
        {"location_id": "cusco-urubamba"},
        {"previous_crop": "quinoa"},
        {"candidate_crop": "potato"},
        {"soil_ph": "7"},
        {"soil_ph": 14.1},
        {"soil_ph_date": "2999-01-01"},
        {"lot_history": [{"crop": "potato", "harvest_date": "2999-01-01"}]},
        {"lot_history": [{"harvest_date": "2024-04-01"}, {"harvest_date": "2024-05-01"}]},
        {
            "lot_history": [{"harvest_date": "2024-04-01"}],
            "plot_context": {"planned_sowing_date": "2024-03-01"},
        },
        {"establishment_moisture": {"kind": "observed", "condition": "moist"}},
        {
            "establishment_moisture": {
                "kind": "measured",
                "value": 30,
                "unit": "%",
                "date": "2024-01-01",
            }
        },
        {
            "establishment_moisture": {
                "kind": "measured",
                "value": 30,
                "unit": "% v/v",
                "date": "2999-01-01",
            }
        },
    ],
)
def test_preliminary_validates_scope_and_field_inputs(settings, sessions, fields):
    with TestClient(create_app(settings)) as client:
        assert (
            client.post("/api/v1/rotations/preliminary", json={**SCOPE, **fields}).status_code
            == 422
        )
