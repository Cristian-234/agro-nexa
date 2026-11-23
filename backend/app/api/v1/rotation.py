import logging
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Request, Response
from pydantic import ValidationError
from sqlalchemy import select

from app.core.errors import ApiError
from app.db.agronomy import Crop
from app.db.models import Location
from app.domain.rotation import (
    alternative,
    climate_evidence,
    needs_climate,
    order_alternatives,
    profile_evidence,
)
from app.repositories.agronomy import approved_catalog
from app.schemas.climate import Period
from app.schemas.rotation import CropOut, RotationInput, RotationResult
from app.services.climate import PERU, get_series, validate_period

router = APIRouter(prefix="/api/v1", tags=["Rotaciones"])
logger = logging.getLogger("agronexa")


@router.get("/crops", response_model=list[CropOut])
def list_crops(request: Request):
    with request.app.state.sessions() as session:
        return session.scalars(select(Crop).order_by(Crop.name_es)).all()


@router.post("/rotations/evaluate", response_model=RotationResult)
def evaluate(request: Request, response: Response, data: RotationInput):
    response.headers["Cache-Control"] = "no-store"
    period = Period(start=data.start, end=data.end)
    today = datetime.now(PERU).date()
    validate_period(period, today)
    state = request.app.state
    settings = state.settings
    warnings = ["La evaluación usa evidencia histórica y requiere interpretación agronómica local."]
    with state.sessions() as session:
        location = session.get(Location, data.location_id)
        if location is None:
            raise ApiError(404, "unknown_location", "La localidad solicitada no existe.")
        region, verified = location.region, location.verified
        try:
            catalog = approved_catalog(session)
            if catalog and catalog.reviewed_on > today:
                raise ValueError("Fecha de revisión futura.")
        except (ValidationError, ValueError):
            logger.warning("El catálogo agronómico aprobado no cumple el contrato.")
            catalog = None
            warnings.append("El catálogo aprobado requiere revisión antes de evaluarse.")

    evidence = profile_evidence(data)
    climate_source = None
    if catalog and needs_climate(catalog, data, region):
        if not verified:
            warnings.append("Falta verificar la coordenada para usar evidencia climática.")
        else:
            with httpx.Client(
                timeout=settings.nasa_timeout_seconds, follow_redirects=False
            ) as client:
                try:
                    series = get_series(state.sessions, client, settings, data.location_id, period)
                except ApiError as exc:
                    if exc.status not in (502, 503, 504):
                        raise
                    warnings.append(
                        "La fuente climática no está disponible para evaluar los criterios."
                    )
                else:
                    climate_source = series.source
                    warnings.extend(series.warnings)
                    evidence.update(climate_evidence(series, settings.min_data_coverage))

    items = [
        alternative(crop, data, region, evidence, catalog, settings.min_rule_coverage)
        for crop in data.candidate_crops
    ]
    items, rank_warnings = order_alternatives(items)
    return RotationResult(
        location_id=data.location_id,
        period=period,
        evaluated_at=datetime.now(UTC),
        rule_set_version=catalog.version if catalog else None,
        min_evidence_coverage=settings.min_rule_coverage,
        climate_source=climate_source,
        alternatives=items,
        warnings=[*warnings, *rank_warnings],
    )
