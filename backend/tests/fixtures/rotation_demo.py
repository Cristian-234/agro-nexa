"""Generate the isolated front-end TEST scenarios from the real rotation motor."""

import json
from datetime import UTC, date, datetime
from pathlib import Path

from app.domain.rotation import alternative, order_alternatives, profile_evidence
from app.schemas.climate import Period
from app.schemas.rotation import CatalogRule, CatalogVersion, RotationInput, RotationResult

OUTPUT = (
    Path(__file__).resolve().parents[3]
    / "frontend/src/features/rotation/demo/rotation-test-fixtures.json"
)
TEST_DATE = date(2024, 6, 1)


def test_rule(crop, key, threshold, *, critical=False):
    return CatalogRule(
        id=f"test-{crop}-{key}",
        crop_id=crop,
        previous_crop_id="potato",
        criterion="pH del suelo" if critical else "Textura del suelo",
        predicate={
            "variable": "soil_ph" if critical else "soil_texture",
            "operator": "between" if critical else "eq",
            "threshold": threshold,
            "unit": "pH" if critical else None,
            "temporal_scope": "recorded_profile",
        },
        weight=2 if critical else 1,
        critical=critical,
        regions=["Puno"],
        geographic_context="Escenario ficticio situado en Ilave.",
        source={
            "url": "https://example.test/",
            "title": "Regla sintética TEST",
            "section": "Ejercicio de demostración",
        },
        # Activation is internal to this fixture and never persisted.
        status="approved",
        reviewed_on=TEST_DATE,
        limitation="Umbral y peso sintéticos para ilustrar el cálculo del motor.",
    )


def build_fixtures():
    catalog = CatalogVersion(
        version="TEST-ROTACIONES-v1",
        status="approved",
        reviewed_on=TEST_DATE,
        rules=[
            test_rule("quinoa", "ph", [6, 8], critical=True),
            test_rule("quinoa", "texture", "loam"),
            test_rule("potato", "ph", [5, 8], critical=True),
            test_rule("potato", "texture", "clay"),
        ],
    )
    fixtures = []
    for scenario, ph in [("comparison", 6.5), ("restriction", 5.5)]:
        data = RotationInput(
            location_id="puno-ilave",
            start=date(2024, 1, 1),
            end=date(2024, 12, 31),
            previous_crop="potato",
            candidate_crops=["quinoa", "potato"],
            irrigation="unknown",
            soil_texture="loam",
            soil_ph=ph,
        )
        evidence = profile_evidence(data)
        minimum = 0.8
        items, warnings = order_alternatives(
            [
                alternative(crop, data, "Puno", evidence, catalog, minimum)
                for crop in data.candidate_crops
            ]
        )
        result = RotationResult(
            location_id=data.location_id,
            period=Period(start=data.start, end=data.end),
            evaluated_at=datetime(2024, 6, 1, tzinfo=UTC),
            rule_set_version=catalog.version,
            min_evidence_coverage=minimum,
            climate_source=None,
            alternatives=items,
            warnings=warnings,
        )
        fixtures.append(
            {
                "scenario": scenario,
                "soil_ph": ph,
                "soil_texture": data.soil_texture,
                "result": result.model_dump(mode="json", exclude={"regional_notes", "plot_notes"}),
            }
        )
    return fixtures


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(build_fixtures(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
