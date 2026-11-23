from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.schemas.rotation import Irrigation, PreviousCrop

CriterionId = Literal[
    "sequence", "ph", "texture", "drainage", "moisture", "precipitation", "temperature"
]
Cultivar = Literal["illpa_inia", "other", "unknown"]
Texture = Literal["sand", "loam", "sandy_loam", "clay", "other", "unknown"]
Drainage = Literal["good", "limited", "poor", "waterlogging", "unknown"]
State = Literal["matches_reference", "outside_reference", "insufficient_information"]
Method = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Position = Literal["slope", "plain", "other", "unknown"]


class FieldInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ObservedMoisture(FieldInput):
    kind: Literal["observed"]
    condition: Literal["dry", "moist", "saturated"] | None
    date: date | None
    method: Method | None = None


class MeasuredMoisture(FieldInput):
    kind: Literal["measured"]
    value: Annotated[float, Field(strict=True, ge=0, le=100)] | None
    unit: Literal["% v/v"]
    date: date | None
    method: Method | None = None


class UnknownMoisture(FieldInput):
    kind: Literal["unknown"]


class LotHarvest(FieldInput):
    crop: PreviousCrop = "unknown"
    harvest_date: date | None = None


class PlotContext(FieldInput):
    planned_sowing_date: date | None = None
    agrochemical_history: (
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
        | None
    ) = None
    elevation_m: Annotated[float, Field(strict=True, allow_inf_nan=False)] | None = None
    position: Position = "unknown"


Moisture = Annotated[
    ObservedMoisture | MeasuredMoisture | UnknownMoisture, Field(discriminator="kind")
]


class PreliminaryInput(FieldInput):
    location_id: Literal["puno-ilave"]
    previous_crop: Literal["potato"]
    candidate_crop: Literal["quinoa"]
    cultivar: Cultivar = "unknown"
    lot_history: list[LotHarvest] = Field(default_factory=list, max_length=8)
    soil_ph: Annotated[float, Field(strict=True, ge=0, le=14)] | None = None
    soil_ph_date: date | None = None
    soil_ph_method: Method | None = None
    soil_texture: Texture = "unknown"
    soil_texture_method: Method | None = None
    drainage: Drainage = "unknown"
    flooding_history: Literal["yes", "no", "unknown"] = "unknown"
    irrigation: Irrigation = "unknown"
    plot_context: PlotContext = Field(default_factory=PlotContext)
    establishment_moisture: Moisture = Field(
        default_factory=lambda: UnknownMoisture(kind="unknown")
    )

    @model_validator(mode="after")
    def check_lot_history(self):
        dated = [entry.harvest_date for entry in self.lot_history if entry.harvest_date]
        if any(newer <= older for newer, older in zip(dated, dated[1:])):
            raise ValueError(
                "Las cosechas fechadas deben ordenarse de la más reciente a la más antigua."
            )
        sowing = self.plot_context.planned_sowing_date
        if sowing and dated and dated[0] > sowing:
            raise ValueError(
                "La siembra prevista debe ser igual o posterior a la última cosecha registrada."
            )
        return self


class Reference(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    version: str
    id: CriterionId
    parameter: str
    value: str | tuple[float, float] | list[str]
    unit: str | None
    scope: str
    source_title: str
    source_url: str
    source_section: str
    source_issuer: str
    source_year: int
    verification: Literal["verified_in_primary_source"]
    criterion_type: Literal["candidate_rule", "documentary_reference", "not_evaluable"]
    location_id: Literal["puno-ilave"]
    cultivar: Literal["illpa_inia"]


class PreliminaryCriterion(BaseModel):
    reference: Reference
    entered_value: dict[str, str | float | list[LotHarvest] | None] | None
    state: State
    explanation: str
    limitation: str
    pending_data: list[str]


class PreliminaryResult(BaseModel):
    location_id: Literal["puno-ilave"]
    cultivar: Cultivar
    version: str
    plot_context: PlotContext
    criteria: list[PreliminaryCriterion]
