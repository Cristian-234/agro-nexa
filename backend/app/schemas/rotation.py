import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.climate import ClimateSource, Period

CropId = Literal["potato", "quinoa"]
PreviousCrop = Literal["potato", "quinoa", "other", "unknown"]
Irrigation = Literal["available", "limited", "none", "unknown"]
Texture = Literal["sand", "loam", "clay", "other", "unknown"]
Priority = Literal["water", "soil_conservation", "climate_adaptation"]
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


class RotationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location_id: Annotated[str, Field(min_length=1, max_length=64, pattern=LOCATION_ID)]
    start: date
    end: date
    previous_crop: PreviousCrop
    candidate_crops: list[CropId] = Field(min_length=1, max_length=2)
    irrigation: Irrigation
    soil_texture: Texture = "unknown"
    soil_ph: FiniteNumber | None = Field(default=None, ge=0, le=14)
    soil_notes: str | None = Field(default=None, max_length=500, repr=False)
    priorities: list[Priority] = Field(default_factory=list, max_length=3)

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
        return self


class CropOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: CropId
    name_es: str
    description: str
    source_url: AnyHttpUrl | None


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
    "soil_texture": {"sand", "loam", "clay", "other"},
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
