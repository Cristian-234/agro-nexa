from __future__ import annotations

import re
from calendar import monthrange
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.climate import ClimateSource, Period

CropId = Annotated[str, Field(min_length=1, max_length=16, pattern=r"^[a-z][a-z0-9-]*$")]
PreviousCrop = CropId
Irrigation = Literal["available", "limited", "none", "unknown"]
Texture = Literal["sand", "loam", "sandy_loam", "clay", "other", "unknown"]
Priority = Literal["water", "soil_conservation", "climate_adaptation"]
WaterSource = Literal["canal", "pozo", "lluvia", "mixto", "unknown"]
SoilFertility = Literal["high", "medium", "low", "unknown"]
RotationObjective = Literal[
    "yield", "water_saving", "soil_conservation", "risk_reduction", "unknown"
]
RuleStatus = Literal["draft", "reviewed", "approved"]
CriterionState = Literal["pass", "fail", "unknown", "not_applicable"]
EvaluationState = Literal["insufficient_evidence", "restriction_detected", "exploratory_comparison"]
ClimateVariable = Literal[
    "mean_temperature", "min_temperature", "max_temperature", "accumulated_precipitation"
]
Variable = Literal[
    "soil_ph",
    "soil_texture",
    "irrigation",
    "mean_temperature",
    "min_temperature",
    "max_temperature",
    "accumulated_precipitation",
]
LOCATION_ID = r"^[a-z0-9-]+$"
FiniteNumber = Annotated[float, Field(strict=True, allow_inf_nan=False)]
KnownAnswer = Literal["yes", "no", "unknown"]


class PlantingAnswers(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    experience: Literal["first", "one_two", "three_more", "unknown"] = "unknown"
    campaigns: int | None = Field(default=None, strict=True, ge=0, le=200)
    repeated: KnownAnswer = "unknown"
    consecutive: int | None = Field(default=None, strict=True, ge=2, le=200)
    other_crop: str | None = Field(default=None, min_length=1, max_length=80, repr=False)
    last_harvest: date | None = None
    last_harvest_approximate: bool = False
    ponding: Literal["yes", "sometimes", "no", "unknown"] = "unknown"
    water: Literal["rain", "irrigation", "both", "unknown"] = "unknown"
    soil_test: KnownAnswer = "unknown"
    ph_date: date | None = None
    ph_method: str | None = Field(default=None, min_length=1, max_length=120)

    @model_validator(mode="after")
    def validate_history(self):
        if self.consecutive is not None and (
            self.repeated != "yes"
            or (self.campaigns is not None and self.consecutive > self.campaigns)
        ):
            raise ValueError("Revisa el número de campañas seguidas del mismo cultivo.")
        if self.campaigns == 0 and self.repeated == "yes":
            raise ValueError("Para indicar repetición debes haber sembrado antes.")
        if self.soil_test != "yes" and (self.ph_date or self.ph_method):
            raise ValueError("Registra fecha y método solo si tienes un análisis de suelo.")
        return self


class CropProfile(BaseModel):
    scientific_name: str
    family: str
    introduction: str
    icon: str
    varieties: list[str]
    references: list[RuleSource]
    evaluation_status: Literal["documentary_only"]


class RotationPlotContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campaign: str | None = Field(default=None, max_length=80)
    plot_area_m2: FiniteNumber | None = Field(default=None, ge=0, le=10_000_000)
    elevation_m: FiniteNumber | None = Field(default=None, ge=0, le=7_000)
    slope_percent: FiniteNumber | None = Field(default=None, ge=0, le=100)
    water_source: WaterSource = "unknown"
    soil_fertility: SoilFertility = "unknown"
    last_yield_kg: FiniteNumber | None = Field(default=None, ge=0, le=100_000_000)
    planned_sowing_date: date | None = None
    planned_harvest_date: date | None = None
    sowing_approximate: bool = False
    harvest_approximate: bool = False
    objective: RotationObjective = "unknown"
    pest_history: str | None = Field(default=None, max_length=500, repr=False)
    previous_history: str | None = Field(default=None, max_length=500, repr=False)

    @model_validator(mode="after")
    def validate_schedule(self):
        sowing, harvest = self.planned_sowing_date, self.planned_harvest_date
        if sowing and self.sowing_approximate:
            sowing = sowing.replace(day=1)
        if harvest and self.harvest_approximate:
            harvest = harvest.replace(day=monthrange(harvest.year, harvest.month)[1])
        if sowing and harvest and harvest < sowing:
            raise ValueError(
                "La cosecha prevista debe ser igual o posterior a la siembra prevista."
            )
        return self


class RotationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location_id: Annotated[str, Field(min_length=1, max_length=64, pattern=LOCATION_ID)]
    start: date
    end: date
    previous_crop: PreviousCrop
    candidate_crops: list[CropId] = Field(min_length=1, max_length=4)
    irrigation: Irrigation
    soil_texture: Texture = "unknown"
    soil_ph: FiniteNumber | None = Field(default=None, ge=0, le=14)
    soil_notes: str | None = Field(default=None, max_length=500, repr=False)
    priorities: list[Priority] = Field(default_factory=list, max_length=3)
    plot_context: RotationPlotContext = Field(default_factory=RotationPlotContext)
    planting_answers: PlantingAnswers | None = None

    @field_validator("start", "end", mode="before")
    @classmethod
    def iso_date(cls, value):
        if type(value) is date or (
            isinstance(value, str) and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value)
        ):
            return value
        raise ValueError("Usa fechas en formato AAAA-MM-DD.")

    @model_validator(mode="after")
    def distinct_choices(self):
        if len(set(self.candidate_crops)) != len(self.candidate_crops):
            raise ValueError("Selecciona cultivos candidatos distintos.")
        if len(set(self.priorities)) != len(self.priorities):
            raise ValueError("Selecciona prioridades distintas.")
        if self.planting_answers:
            answers = self.planting_answers
            if answers.other_crop and self.previous_crop != "other":
                raise ValueError("Selecciona otro cultivo para indicar su nombre.")
            if self.soil_ph is not None and answers.soil_test != "yes":
                raise ValueError("El pH necesita un análisis de suelo declarado.")
            if answers.water == "rain" and self.plot_context.water_source in (
                "canal",
                "pozo",
                "mixto",
            ):
                raise ValueError("Revisa la fuente de agua declarada para el terreno.")
            if (answers.experience == "first" or answers.campaigns == 0) and (
                self.previous_crop not in ("unknown", "fallow")
                or answers.campaigns
                or answers.last_harvest
                or answers.repeated == "yes"
            ):
                raise ValueError("Revisa el historial si es la primera vez que siembras aquí.")
            if answers.last_harvest and self.plot_context.planned_sowing_date:
                last = answers.last_harvest
                sowing = self.plot_context.planned_sowing_date
                if self.plot_context.sowing_approximate:
                    sowing = sowing.replace(day=monthrange(sowing.year, sowing.month)[1])
                if (last.replace(day=1) if answers.last_harvest_approximate else last) > sowing:
                    raise ValueError(
                        "La siembra prevista debe ocurrir después de la última cosecha."
                    )
        return self


class CropOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: CropId
    name_es: str
    description: str
    source_url: AnyHttpUrl | None
    profile: CropProfile | None = None


class RuleSource(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    url: AnyHttpUrl
    title: str = Field(min_length=1, max_length=250)
    section: str = Field(min_length=1, max_length=250)


UNITS = {
    "soil_ph": "pH",
    "soil_texture": None,
    "irrigation": None,
    "mean_temperature": "degC",
    "min_temperature": "degC",
    "max_temperature": "degC",
    "accumulated_precipitation": "mm",
}
CATEGORIES = {
    "soil_texture": {"sand", "loam", "sandy_loam", "clay", "other"},
    "irrigation": {"available", "limited", "none"},
}


class Predicate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    variable: Variable
    operator: Literal["eq", "gte", "lte", "between"]
    threshold: FiniteNumber | str | tuple[FiniteNumber, FiniteNumber]
    unit: Literal["pH", "degC", "mm"] | None = None
    temporal_scope: Literal["reference_period", "recorded_profile"]

    @model_validator(mode="after")
    def validate_predicate(self):
        profile = self.variable in {"soil_ph", *CATEGORIES}
        scope = "recorded_profile" if profile else "reference_period"
        if self.unit != UNITS[self.variable] or self.temporal_scope != scope:
            raise ValueError("Unidad o periodo incompatible con la variable.")
        if self.variable in CATEGORIES:
            if (
                self.operator != "eq"
                or not isinstance(self.threshold, str)
                or self.threshold not in CATEGORIES[self.variable]
            ):
                raise ValueError("La categoría requiere un valor conocido y el operador eq.")
        elif self.operator == "between":
            if not isinstance(self.threshold, tuple) or self.threshold[0] > self.threshold[1]:
                raise ValueError("El rango debe tener límites numéricos ordenados.")
        elif not isinstance(self.threshold, float):
            raise ValueError("La condición requiere un umbral numérico.")
        return self


class CatalogRule(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    id: str = Field(min_length=1, max_length=64, pattern=LOCATION_ID)
    crop_id: CropId
    previous_crop_id: CropId | None = None
    criterion: str = Field(min_length=1, max_length=250)
    predicate: Predicate
    weight: FiniteNumber = Field(gt=0)
    critical: bool
    regions: list[Literal["Puno", "Cusco", "Arequipa"]] = Field(min_length=1, max_length=3)
    geographic_context: str = Field(min_length=1, max_length=500)
    source: RuleSource
    status: RuleStatus
    reviewed_on: date | None = None
    limitation: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def approved_review(self):
        if self.status == "approved" and self.reviewed_on is None:
            raise ValueError("Una regla aprobada requiere fecha de revisión.")
        return self


class CatalogVersion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    status: RuleStatus
    reviewed_on: date | None = None
    rules: list[CatalogRule]

    @model_validator(mode="after")
    def validate_version(self):
        if len({rule.id for rule in self.rules}) != len(self.rules):
            raise ValueError("Los identificadores de regla deben ser únicos por versión.")
        if self.status == "approved" and (
            self.reviewed_on is None
            or not any(rule.status == "approved" for rule in self.rules)
            or any(rule.reviewed_on and rule.reviewed_on > self.reviewed_on for rule in self.rules)
        ):
            raise ValueError("Verifica las fechas y las reglas aprobadas de la versión.")
        return self


class CriterionResult(BaseModel):
    rule_id: str
    criterion: str
    state: CriterionState
    variable: Variable
    value: float | str | None
    unit: str | None
    predicate: Predicate
    weight: float
    critical: bool
    source: RuleSource
    evidence_origin: Literal["ficha", "NASA POWER"] | None
    evidence_coverage: float | None
    geographic_context: str
    reviewed_on: date
    limitation: str
    explanation: str


class Alternative(BaseModel):
    crop_id: CropId
    state: EvaluationState
    rule_set_version: str | None
    criteria: list[CriterionResult]
    evidence_coverage: float
    score: float | None
    rank: int | None = None
    warnings: list[str]


class RotationResult(BaseModel):
    location_id: str
    period: Period
    evaluated_at: datetime
    rule_set_version: str | None
    min_evidence_coverage: float
    climate_source: ClimateSource | None
    alternatives: list[Alternative]
    warnings: list[str]
    regional_notes: list[RegionalNote] = Field(default_factory=list)
    plot_notes: list[PlotNote] = Field(default_factory=list)


class RegionalNote(BaseModel):
    crop_id: CropId
    state: Literal["attention", "missing_data", "reference"]
    message: str
    matrix_id: str | None = None
    matrix_page: int | None = None
    version: Literal["regional-v0.3"] = "regional-v0.3"
    sources: list[RuleSource] = Field(default_factory=list)


class PlotNote(BaseModel):
    state: Literal["attention", "missing_data"]
    message: str
