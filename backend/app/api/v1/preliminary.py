from datetime import datetime

from fastapi import APIRouter, Request, Response
from sqlalchemy import select

from app.core.errors import ApiError
from app.db.agronomy import BibliographicReference, Crop
from app.db.models import Location
from app.domain.preliminary import CATALOG_VERSION, CRITERIA, evaluate_criterion
from app.schemas.preliminary import PreliminaryInput, PreliminaryResult, Reference
from app.services.climate import PERU

router = APIRouter(prefix="/api/v1/rotations", tags=["Evaluación preliminar"])


def load_references(
    request: Request, location_id: str | None = None, lot_crops: set[str] | None = None
) -> list[Reference]:
    with request.app.state.sessions() as session:
        if location_id and session.get(Location, location_id) is None:
            raise ApiError(404, "unknown_location", "La localidad solicitada no existe.")
        if lot_crops:
            crop_ids = set(session.scalars(select(Crop.id)))
            if not lot_crops <= (crop_ids | {"unknown", "other", "fallow"}):
                raise ApiError(422, "unknown_crop", "Revisa los cultivos del historial.")
        statement = select(BibliographicReference).where(
            BibliographicReference.version == CATALOG_VERSION
        )
        references = {row.id: Reference.model_validate(row) for row in session.scalars(statement)}

    if references.keys() != set(CRITERIA):
        raise ApiError(503, "references_unavailable", "El catálogo bibliográfico está incompleto.")
    return [references[criterion] for criterion in CRITERIA]


@router.get("/references", response_model=list[Reference])
def get_references(request: Request):
    return load_references(request)


@router.post("/preliminary", response_model=PreliminaryResult)
def preliminary(request: Request, response: Response, data: PreliminaryInput):
    today = datetime.now(PERU).date()
    moisture = data.establishment_moisture
    moisture_date = moisture.date if moisture.kind != "unknown" else None
    field_dates = (
        data.soil_ph_date,
        moisture_date,
        *(entry.harvest_date for entry in data.lot_history),
    )
    if any(day and day > today for day in field_dates):
        raise ApiError(
            422,
            "future_measurement",
            "Las fechas de observación, medición y cosecha no pueden ser futuras.",
        )
    references = load_references(
        request, data.location_id, {item.crop for item in data.lot_history}
    )
    response.headers["Cache-Control"] = "no-store"
    return PreliminaryResult(
        location_id=data.location_id,
        cultivar=data.cultivar,
        version=CATALOG_VERSION,
        plot_context=data.plot_context,
        criteria=[evaluate_criterion(reference, data) for reference in references],
    )
