from collections.abc import Callable, Collection
from dataclasses import dataclass
from itertools import groupby
from math import fsum
from typing import Literal

from app.core.config import Settings
from app.schemas.climate import (
    ClimateSeries,
    ClimateSummary,
    Grouping,
    Indicator,
    IndicatorCode,
    IndicatorGroup,
    Period,
)

PRECIPITATION = "accumulated_precipitation"


@dataclass(frozen=True)
class IndicatorDefinition:
    variable: Literal["t2m", "t2m_min", "t2m_max", "prectotcorr"]
    unit: Literal["degC", "mm", "days"]
    method: Literal["common_valid_days", "observed_extrema", "complete_period"]
    calculate: Callable[[Collection[float]], float]


def mean(values: Collection[float]) -> float:
    return fsum(values) / len(values)


def definitions(rain_threshold: float) -> dict[IndicatorCode, IndicatorDefinition]:
    return {
        "mean_temperature": IndicatorDefinition("t2m", "degC", "common_valid_days", mean),
        "min_temperature": IndicatorDefinition("t2m_min", "degC", "observed_extrema", min),
        "max_temperature": IndicatorDefinition("t2m_max", "degC", "observed_extrema", max),
        PRECIPITATION: IndicatorDefinition("prectotcorr", "mm", "complete_period", fsum),
        "potential_frost_days": IndicatorDefinition(
            "t2m_min",
            "days",
            "common_valid_days",
            lambda values: sum(v <= 0 for v in values),
        ),
        "rainy_days": IndicatorDefinition(
            "prectotcorr",
            "days",
            "common_valid_days",
            lambda values: sum(v >= rain_threshold for v in values),
        ),
    }


def coverage_pct(valid: int, expected: int) -> float:
    return round(100 * valid / expected, 1)


def summarize(series: ClimateSeries, group_by: Grouping, settings: Settings) -> ClimateSummary:
    specs = definitions(settings.rain_day_threshold_mm)
    groups = []
    for _, group in groupby(
        series.series,
        key=lambda row: (row.date.year, row.date.month)
        if group_by == "month"
        else row.date.year
        if group_by == "year"
        else None,
    ):
        rows = list(group)
        n = len(rows)
        indicators: dict[IndicatorCode, Indicator] = {}
        warnings = []
        for code, spec in specs.items():
            values = [value for row in rows if (value := getattr(row, spec.variable)) is not None]
            valid = len(values)
            status: Literal["complete", "partial", "insufficient", "no_data"]
            if valid == 0:
                status = "no_data"
            elif valid == n:
                status = "complete"
            elif code == PRECIPITATION or valid / n >= settings.min_data_coverage:
                status = "partial"
            else:
                status = "insufficient"
            indicators[code] = Indicator(
                value=round(spec.calculate(values), 1) if values else None,
                unit=spec.unit,
                valid_days=valid,
                expected_days=n,
                coverage_pct=coverage_pct(valid, n),
                status=status,
            )
        if indicators[PRECIPITATION].status == "partial":
            warnings.append("La precipitación presenta un acumulado observado parcial.")
        if any(i.valid_days / n < settings.min_data_coverage for i in indicators.values()):
            warnings.append(
                "Al menos un indicador tiene cobertura por debajo del umbral configurado."
            )
        groups.append(
            IndicatorGroup(
                period=Period(start=rows[0].date, end=rows[-1].date),
                indicators=indicators,
                warnings=warnings,
            )
        )
    return ClimateSummary(
        location_id=series.location_id,
        period=series.period,
        source=series.source,
        group_by=group_by,
        min_coverage_pct=round(settings.min_data_coverage * 100, 1),
        rain_day_threshold_mm=settings.rain_day_threshold_mm,
        groups=groups,
        warnings=series.warnings,
    )
