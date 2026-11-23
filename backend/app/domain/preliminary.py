from app.schemas.preliminary import CriterionId, PreliminaryCriterion, PreliminaryInput, Reference

CATALOG_VERSION = "illpa-inia-ilave-v2"
CRITERIA: tuple[CriterionId, ...] = (
    "sequence",
    "ph",
    "texture",
    "drainage",
    "moisture",
    "precipitation",
    "temperature",
)


def evaluate_criterion(reference: Reference, data: PreliminaryInput) -> PreliminaryCriterion:
    criterion = PreliminaryCriterion(
        reference=reference,
        entered_value=None,
        state="insufficient_information",
        explanation="",
        limitation="",
        pending_data=[],
    )
    confirmed = data.cultivar == "illpa_inia"
    cultivar_pending = (
        "Consultar referencias específicas del cultivar declarado."
        if data.cultivar == "other"
        else "Confirmar si el cultivar es Illpa INIA."
    )

    if reference.id == "sequence":
        criterion.entered_value = {
            "previous_crop": data.previous_crop,
            "candidate_crop": data.candidate_crop,
        }
        if data.lot_history:
            criterion.entered_value["lot_history"] = data.lot_history
        criterion.limitation = "El contraste usa el historial declarado del mismo lote. La secuencia publicada no valida su aptitud, sanidad ni productividad."
        latest = data.lot_history[0] if data.lot_history else None
        if not confirmed:
            criterion.pending_data.append(cultivar_pending)
        if latest is None or latest.crop == "unknown":
            criterion.pending_data.append(
                "Identificar el cultivo inmediatamente anterior del mismo lote."
            )
        if latest is None or latest.harvest_date is None:
            criterion.pending_data.append("Registrar su fecha de cosecha.")
        if criterion.pending_data:
            criterion.explanation = "El contraste requiere el antecedente inmediato fechado del mismo lote y la confirmación de Illpa INIA."
        elif latest and latest.crop == "potato":
            criterion.state = "matches_reference"
            criterion.explanation = (
                "El historial declara una cosecha de papa inmediatamente anterior en el mismo lote."
            )
        else:
            criterion.state = "outside_reference"
            criterion.explanation = "El historial declara un cultivo distinto de papa inmediatamente anterior en el mismo lote."
    elif reference.id == "ph":
        criterion.entered_value = {
            "soil_ph": data.soil_ph,
            "date": data.soil_ph_date.isoformat() if data.soil_ph_date else None,
        }
        if data.soil_ph_method:
            criterion.entered_value["method"] = data.soil_ph_method
        criterion.limitation = "El intervalo describe la adaptación de Illpa INIA. Importan el muestreo y el método de medición."
        if not confirmed:
            criterion.pending_data.append(cultivar_pending)
        if data.soil_ph is None:
            criterion.pending_data.append("Medir el pH del suelo de la parcela.")
        if data.soil_ph_date is None:
            criterion.pending_data.append("Registrar la fecha de medición del pH.")
        if data.soil_ph_method is None:
            criterion.pending_data.append("Registrar el método de medición del pH.")
        if criterion.pending_data:
            criterion.explanation = (
                "El contraste requiere cultivar confirmado y una medición de pH con fecha y método."
            )
        else:
            low, high = reference.value
            assert isinstance(low, float) and isinstance(high, float) and data.soil_ph is not None
            if low <= data.soil_ph <= high:
                criterion.state = "matches_reference"
                criterion.explanation = (
                    "El pH medido está dentro del intervalo publicado para Illpa INIA."
                )
            else:
                criterion.state = "outside_reference"
                criterion.explanation = (
                    "El pH medido está fuera del intervalo publicado para Illpa INIA."
                )
    elif reference.id == "texture":
        criterion.entered_value = {"soil_texture": data.soil_texture}
        if data.soil_texture_method:
            criterion.entered_value["method"] = data.soil_texture_method
        criterion.limitation = "La textura no permite determinar el drenaje de la parcela."
        if not confirmed:
            criterion.pending_data.append(cultivar_pending)
        if data.soil_texture == "unknown":
            criterion.pending_data.append("Identificar la clase textural de la parcela.")
        if data.drainage == "unknown":
            criterion.pending_data.append("Registrar el drenaje como observación independiente.")
        if criterion.pending_data:
            criterion.explanation = "El contraste requiere cultivar confirmado, clase textural y un registro independiente de drenaje."
        elif data.soil_texture in reference.value:
            criterion.state = "matches_reference"
            criterion.explanation = (
                "La textura declarada figura entre las clases descritas para Illpa INIA."
            )
        else:
            criterion.state = "outside_reference"
            criterion.explanation = (
                "La textura declarada no figura entre las clases descritas para Illpa INIA."
            )
    elif reference.id == "drainage":
        criterion.entered_value = {"drainage": data.drainage}
        if data.flooding_history != "unknown":
            criterion.entered_value["flooding_history"] = data.flooding_history
        criterion.explanation = (
            "El drenaje se registra por separado como característica de la parcela."
        )
        criterion.limitation = "La guía de Cusco aporta contexto general. Falta un criterio local para contrastar este dato."
        if data.drainage == "unknown":
            criterion.pending_data.append("Observar y registrar el drenaje de la parcela.")
        if data.flooding_history == "unknown":
            criterion.pending_data.append("Consultar antecedentes de inundación del lote.")
        if data.drainage in ("poor", "waterlogging") or data.flooding_history == "yes":
            criterion.explanation = "La ficha reporta drenaje deficiente, encharcamiento o inundación previa. Revisar esta condición en campo con el asesor."
        criterion.pending_data.append(
            "Revisar la aplicabilidad de la referencia de drenaje en Ilave."
        )
    elif reference.id == "moisture":
        moisture = data.establishment_moisture.model_dump(mode="json", exclude_none=True)
        criterion.entered_value = {"irrigation": data.irrigation, **moisture}
        criterion.explanation = (
            "La fuente describe la humedad al sembrar sin definir una escala para evaluarla."
        )
        criterion.limitation = (
            "La disponibilidad de riego no mide la humedad del suelo ni sustituye su observación."
        )
        if data.establishment_moisture.kind == "unknown":
            criterion.pending_data.append(
                "Registrar una observación o medición fechada durante el establecimiento."
            )
        else:
            observation = data.establishment_moisture
            if observation.method is None:
                criterion.pending_data.append("Registrar el método usado en campo.")
            if observation.date is None:
                criterion.pending_data.append("Registrar la fecha de la observación o medición.")
            if observation.kind == "observed" and observation.condition is None:
                criterion.pending_data.append("Registrar la condición observada.")
            if observation.kind == "measured" and observation.value is None:
                criterion.pending_data.append("Registrar el valor de humedad medido.")
        criterion.pending_data.append(
            "Precisar el método y un criterio local para interpretar la humedad."
        )
    elif reference.id == "precipitation":
        criterion.explanation = "El intervalo se conserva como referencia bibliográfica."
        criterion.limitation = "El folleto no indica el periodo de acumulación. No se contrasta con totales de NASA POWER."
        criterion.pending_data = [
            "Confirmar el periodo y la forma de acumulación de la precipitación."
        ]
    elif reference.id == "temperature":
        criterion.explanation = "El intervalo se conserva como referencia bibliográfica."
        criterion.limitation = "El folleto no indica la estadística ni el periodo. No se contrasta con agregados de NASA POWER."
        criterion.pending_data = [
            "Confirmar la estadística, el periodo y su relación con la etapa del cultivo."
        ]

    return criterion
