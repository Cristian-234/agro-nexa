from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    region: str
    latitude: float
    longitude: float
    coordinate_source: str
    verified: bool


class Period(BaseModel):
    start: date
    end: date


class DailyRow(BaseModel):
    date: date
    t2m: float | None
    t2m_min: float | None
    t2m_max: float | None
    prectotcorr: float | None
    quality_flags: dict[str, str]


class ClimateSource(BaseModel):
    provider: str
    product: str
    version: str
    fetched_at: datetime
    cache_status: Literal["fresh", "cached", "stale"]
    cache_age_seconds: int
    time_standard: Literal["LST"]
    resolution: str
    documentation_url: str
    response_sha256: str
    metadata: dict


class Quality(BaseModel):
    expected_days: int
    valid_days_by_variable: dict[str, int]
    coverage_pct_by_variable: dict[str, float]


class ClimateSeries(BaseModel):
    location_id: str
    period: Period
    source: ClimateSource
    units: dict[str, str]
    series: list[DailyRow]
    quality: Quality
    warnings: list[str]


Grouping = Literal["month", "year", "period"]
IndicatorCode = Literal[
    "mean_temperature",
    "min_temperature",
    "max_temperature",
    "accumulated_precipitation",
    "potential_frost_days",
    "rainy_days",
]


class Indicator(BaseModel):
    value: float | None
    unit: Literal["degC", "mm", "days"]
    valid_days: int
    expected_days: int
    coverage_pct: float
    status: Literal["complete", "partial", "insufficient", "no_data"]


class IndicatorGroup(BaseModel):
    period: Period
    indicators: dict[IndicatorCode, Indicator]
    warnings: list[str]


class ClimateSummary(BaseModel):
    location_id: str
    period: Period
    source: ClimateSource
    group_by: Grouping
    min_coverage_pct: float
    rain_day_threshold_mm: float
    groups: list[IndicatorGroup]
    warnings: list[str]


class IndicatorDifference(BaseModel):
    value: float | None
    unit: Literal["degC", "mm", "days"]
    method: Literal["common_valid_days", "observed_extrema", "complete_period"]
    status: Literal["available", "insufficient", "incomplete_precipitation", "incompatible"]
    common_valid_days: int
    common_coverage_pct: float


class LocationPair(BaseModel):
    location_a: str
    location_b: str
    differences: dict[IndicatorCode, IndicatorDifference]
    warnings: list[str]


class ClimateComparison(BaseModel):
    locations: list[ClimateSummary]
    aligned_period: Period
    comparisons: list[LocationPair]
    warnings: list[str]


class ClimateExploration(ClimateSummary):
    series: list[DailyRow]


class ClimateMonthlyComparison(ClimateComparison):
    monthly_groups: dict[str, list[IndicatorGroup]]
