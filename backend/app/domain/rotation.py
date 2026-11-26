from dataclasses import dataclass
from fractions import Fraction
from typing import Literal

from app.schemas.climate import ClimateSeries
from app.schemas.rotation import (
    Alternative,
    CatalogRule,
    CatalogVersion,
    CriterionResult,
    CropId,
    RotationInput,
)
from app.services.indicators import definitions


@dataclass(frozen=True)
class Evidence:
    value: float | str | None
    origin: Literal["ficha", "NASA POWER"]
    coverage: float | None
    explanation: str


def profile_evidence(data: RotationInput) -> dict[str, Evidence]:
    ph = data.soil_ph
    if data.planting_answers and not (
        data.planting_answers.ph_date and data.planting_answers.ph_method
    ):
        ph = None
    return {
        field: Evidence(
            None if value == "unknown" else value,
            "ficha",
            None,
            "Falta el dato en la ficha."
            if value in (None, "unknown")
            else "Dato registrado en la ficha.",
        )
        for field, value in (
            ("soil_ph", ph),
            ("soil_texture", data.soil_texture),
            ("irrigation", data.irrigation),
        )
    }


def needs_climate(catalog: CatalogVersion, data: RotationInput, region: str) -> bool:
    return any(
        rule.status == "approved"
        and rule.crop_id in data.candidate_crops
        and region in rule.regions
        and (rule.previous_crop_id is None or rule.previous_crop_id == data.previous_crop)
        and rule.predicate.temporal_scope == "reference_period"
        for rule in catalog.rules
    )


def climate_evidence(series: ClimateSeries, min_coverage: float) -> dict[str, Evidence]:
    results = {}
    for code, spec in definitions(1).items():
        if spec.unit == "days":
            continue
        values = [
            value
            for row in series.series
            if (value := getattr(row, spec.variable)) is not None
            and spec.variable not in row.quality_flags
        ]
        coverage = len(values) / series.quality.expected_days
        value = None
        if series.source.cache_status == "stale":
            reason = "La instantánea climática tiene caché desactualizada."
        elif code == "accumulated_precipitation" and coverage < 1:
            reason = (
                "El acumulado observado tiene días faltantes. Se requiere el total del periodo."
            )
        elif not values or coverage < min_coverage:
            reason = "La serie tiene cobertura insuficiente para este criterio."
        else:
            value = spec.calculate(values)
            reason = "Indicador calculado sobre las observaciones válidas del periodo."
        results[code] = Evidence(value, "NASA POWER", coverage, reason)
    return results


def meets(rule: CatalogRule, value: float | str) -> bool:
    predicate = rule.predicate
    target = predicate.threshold
    if predicate.operator == "eq":
        return value == target
    # Los predicados validados solo aceptan números para comparaciones ordenadas.
    if not isinstance(value, (float, int)):
        return False
    if isinstance(target, tuple):
        return target[0] <= value <= target[1]
    if not isinstance(target, float):
        return False
    return value >= target if predicate.operator == "gte" else value <= target


def criterion_result(
    rule: CatalogRule, data: RotationInput, region: str, evidence: dict[str, Evidence]
) -> CriterionResult:
    source = evidence.get(rule.predicate.variable)
    state: Literal["pass", "fail", "unknown", "not_applicable"]
    value = coverage = origin = None
    if region not in rule.regions:
        state, explanation = (
            "not_applicable",
            "El alcance geográfico de la regla excluye esta localidad.",
        )
    elif rule.previous_crop_id and data.previous_crop not in ("unknown", rule.previous_crop_id):
        state, explanation = "not_applicable", "La regla corresponde a otra secuencia de cultivos."
    elif rule.previous_crop_id and data.previous_crop == "unknown":
        state, explanation = "unknown", "Falta el cultivo anterior para comprobar la secuencia."
    elif source is None:
        state, explanation = "unknown", "Falta evidencia climática utilizable para este criterio."
    else:
        value, coverage, origin = source.value, source.coverage, source.origin
        if value is None:
            state, explanation = "unknown", source.explanation
        else:
            state = "pass" if meets(rule, value) else "fail"
            outcome = "Cumple la condición." if state == "pass" else "Incumple la condición."
            explanation = f"{outcome} {source.explanation}"
    return CriterionResult(
        rule_id=rule.id,
        criterion=rule.criterion,
        state=state,
        variable=rule.predicate.variable,
        value=value,
        unit=rule.predicate.unit,
        predicate=rule.predicate,
        weight=rule.weight,
        critical=rule.critical,
        source=rule.source,
        evidence_origin=origin,
        evidence_coverage=coverage,
        geographic_context=rule.geographic_context,
        reviewed_on=rule.reviewed_on,
        limitation=rule.limitation,
        explanation=explanation,
    )


def weight(criteria: list[CriterionResult]) -> Fraction:
    return sum((Fraction(str(criterion.weight)) for criterion in criteria), Fraction())


def alternative(
    crop: CropId,
    data: RotationInput,
    region: str,
    evidence: dict[str, Evidence],
    catalog: CatalogVersion | None,
    minimum: float,
) -> Alternative:
    criteria = [
        criterion_result(rule, data, region, evidence)
        for rule in (catalog.rules if catalog else [])
        if rule.status == "approved" and rule.crop_id == crop
    ]
    applicable = [item for item in criteria if item.state != "not_applicable"]
    known = [item for item in applicable if item.state in {"pass", "fail"}]
    available_weight = weight(known)
    coverage = available_weight / weight(applicable) if applicable else Fraction()
    state = "insufficient_evidence"
    score = None
    warnings = []
    if not applicable:
        warnings.append(
            "Faltan reglas agronómicas aprobadas para este cultivo, secuencia y localidad."
            if catalog
            else "Faltan reglas agronómicas aprobadas en el catálogo."
        )
    elif any(item.critical and item.state == "fail" for item in known):
        state = "restriction_detected"
        warnings.append("Un criterio crítico incumplido limita esta alternativa.")
    elif any(item.critical and item.state == "unknown" for item in applicable):
        warnings.append("Falta evidencia para al menos un criterio crítico.")
    elif not known or coverage < Fraction(str(minimum)):
        warnings.append("La cobertura de evidencia es insuficiente.")
    else:
        state = "exploratory_comparison"
        score = float(
            round(
                100 * weight([item for item in known if item.state == "pass"]) / available_weight, 1
            )
        )
    if len(known) != len(applicable):
        warnings.append(
            "Consulta los criterios desconocidos para identificar los datos pendientes."
        )
    return Alternative(
        crop_id=crop,
        rule_set_version=catalog.version if catalog else None,
        criteria=criteria,
        evidence_coverage=float(coverage),
        state=state,
        score=score,
        warnings=warnings,
    )


def ranking_signature(item: Alternative) -> list[tuple]:
    return sorted(
        (
            criterion.criterion,
            criterion.variable,
            criterion.unit or "",
            criterion.predicate.operator,
            criterion.predicate.temporal_scope,
            criterion.weight,
            criterion.critical,
            criterion.state == "unknown",
        )
        for criterion in item.criteria
        if criterion.state != "not_applicable"
    )


def order_alternatives(items: list[Alternative]) -> tuple[list[Alternative], list[str]]:
    eligible = [item for item in items if item.score is not None]
    pending = [item for item in items if item.state == "insufficient_evidence"]
    restricted = [item for item in items if item.state == "restriction_detected"]
    warnings = []
    if len(eligible) > 1:
        if all(ranking_signature(item) == ranking_signature(eligible[0]) for item in eligible[1:]):
            eligible.sort(key=lambda item: -item.score)
            last = None
            for index, item in enumerate(eligible, start=1):
                if item.score != last:
                    rank = index
                    last = item.score
                item.rank = rank
        else:
            warnings.append(
                "Las puntuaciones usan criterios distintos y deben interpretarse por separado."
            )
    return [*eligible, *pending, *restricted], warnings
