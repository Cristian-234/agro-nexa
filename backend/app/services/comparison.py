from itertools import combinations

from app.core.config import Settings
from app.schemas.climate import ClimateComparison, ClimateSeries, IndicatorDifference, LocationPair
from app.services.indicators import PRECIPITATION, coverage_pct, definitions, summarize


def source_signature(series: ClimateSeries) -> tuple:
    source = series.source
    return source.provider, source.product, source.time_standard, source.resolution, series.units


def compare(series: list[ClimateSeries], settings: Settings) -> ClimateComparison:
    specs = definitions(settings.rain_day_threshold_mm)
    period = series[0].period
    expected = (period.end - period.start).days + 1
    locations = [summarize(item, "period", settings) for item in series]
    variables = dict.fromkeys(spec.variable for spec in specs.values())
    dated = [
        {
            variable: {
                row.date: value
                for row in item.series
                if (value := getattr(row, variable)) is not None
            }
            for variable in variables
        }
        for item in series
    ]
    complete_rain = all(
        location.groups[0].indicators[PRECIPITATION].status == "complete" for location in locations
    )
    warnings = [f"{item.location_id}: {warning}" for item in series for warning in item.warnings]
    if not complete_rain:
        warnings.append(
            "La comparación de precipitación acumulada requiere cobertura completa "
            "en todas las localidades seleccionadas."
        )
    pairs = []
    for a, b in combinations(range(len(series)), 2):
        pair_warnings = []
        differences = {}
        compatible = source_signature(series[a]) == source_signature(series[b])
        if not compatible:
            pair_warnings.append(
                "Las fuentes, resoluciones, estándares temporales o unidades difieren."
            )
        elif series[a].source.version != series[b].source.version:
            pair_warnings.append("Las versiones de API de las dos corridas difieren.")
        for code, spec in specs.items():
            left, right = dated[a][spec.variable], dated[b][spec.variable]
            common = sorted(left.keys() & right.keys())
            if len(common) < max(len(left), len(right)):
                pair_warnings.append(
                    f"Las fechas válidas de {spec.variable} difieren entre localidades."
                )
            value = None
            if not compatible:
                status = "incompatible"
            elif spec.method == "complete_period" and not complete_rain:
                status = "incomplete_precipitation"
            else:
                if spec.method == "common_valid_days":
                    left_values = [left[day] for day in common]
                    right_values = [right[day] for day in common]
                else:
                    left_values, right_values = left.values(), right.values()
                usable = min(len(left_values), len(right_values))
                if usable and usable / expected >= settings.min_data_coverage:
                    value = round(spec.calculate(left_values) - spec.calculate(right_values), 1)
                    status = "available"
                else:
                    status = "insufficient"
            differences[code] = IndicatorDifference(
                value=value,
                unit=spec.unit,
                method=spec.method,
                status=status,
                common_valid_days=len(common),
                common_coverage_pct=coverage_pct(len(common), expected),
            )
        if any(diff.status == "insufficient" for diff in differences.values()):
            pair_warnings.append(
                "La cobertura disponible es insuficiente para al menos una diferencia."
            )
        pairs.append(
            LocationPair(
                location_a=series[a].location_id,
                location_b=series[b].location_id,
                differences=differences,
                warnings=list(dict.fromkeys(pair_warnings)),
            )
        )
    return ClimateComparison(
        locations=locations,
        aligned_period=period,
        comparisons=pairs,
        warnings=warnings,
    )
