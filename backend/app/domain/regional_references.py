"""Documentary matrix v0.3. These entries are independent of approved rules."""

from app.schemas.rotation import PlotNote, RegionalNote, RotationInput, RuleSource

CROPS = ("potato", "quinoa", "barley", "faba-bean")
CROP_CODES = dict(zip(CROPS, ("PAP", "QUI", "CEB", "HAB")))
MATRIX = {
    "Puno": (
        "PUN",
        (
            ("R", "DB OC", "I", "I"),
            ("I", "OC R", "DB", "I"),
            ("I", "OC", "R", "DB"),
            ("DB", "OC", "I", "RB"),
        ),
    ),
    "Cusco": (
        "CUS",
        (
            ("R", "I", "DD", "DJ"),
            ("I", "R", "I", "I"),
            ("I", "I", "R", "DJ"),
            ("I", "I", "I", "R"),
        ),
    ),
    "Arequipa": (
        "AQP",
        (
            ("R", "DG", "I", "I"),
            ("I", "R", "I", "I"),
            ("I", "DG", "R", "I"),
            ("I", "DG", "I", "R"),
        ),
    ),
}
SOURCES = {
    "B": (
        "https://agropuno.gob.pe/Archivos/Biblioteca/manual_mip_haba.pdf#page=18",
        "DRA Puno · Manual de manejo integrado de plagas y enfermedades en haba",
        "p. 18 · Ejemplo altoandino de Yunguyo",
    ),
    "C": (
        "https://agropuno.gob.pe/Archivos/Biblioteca/agentes_cp_quinua_q.pdf#page=25",
        "DRA Puno · Cadena productiva de quinua",
        "Cuadro 9, p. 25 · Puno 2009–2010, según variedad y antecedente",
    ),
    "D": (
        "https://repositorio.inia.gob.pe/items/54783374-187d-4cbd-9d2e-f6a10d1ca4f0",
        "INIA · Cebada INIA 447 Luzmalta",
        "Adaptación, siembra y rotación · Cusco, ámbito varietal",
    ),
    "G": (
        "https://www.agroarequipa.gob.pe/images/boletines/biblioteca/Folleto%20Quinua%202020_compressed.pdf",
        "Gerencia Regional de Agricultura · Cultivo de quinua en Andaray",
        "Planificación del cultivo · Andaray, Condesuyos",
    ),
    "J": (
        "https://repositorio.inia.gob.pe/items/e4eef787-0290-4124-bb51-9230c3c72ea1",
        "INIA · Haba INIA 401-Cusco",
        "p. 2 · INIA 401, antecedente papa o cereal de grano",
    ),
}

MESSAGES = {
    "D": "La matriz cita esta transición como antecedente documental en el ámbito de la fuente. Confirma la zona y la variedad antes de aplicarla a tu terreno.",
    "O": "La matriz reúne observaciones de campo para ciertas variedades. Sirven como referencia y requieren revisión local.",
    "R": "Estás considerando repetir el cultivo. Conviene revisar cuántas campañas lo sembraste y si hubo enfermedades.",
    "I": "La matriz registra evidencia directa insuficiente para esta combinación en la región. Puedes revisar el clima y los datos de tu terreno.",
}
STATES = {"D": "reference", "O": "reference", "R": "attention", "I": "missing_data"}


def regional_notes(data: RotationInput, region: str) -> list[RegionalNote]:
    if data.planting_answers is None:
        return []
    notes = []
    for crop in data.candidate_crops:
        if region not in MATRIX or data.previous_crop not in CROPS or crop not in CROPS:
            notes.append(
                RegionalNote(
                    crop_id=crop,
                    state="missing_data",
                    message="Hace falta un antecedente y una zona cubiertos por la matriz para comparar esta secuencia.",
                )
            )
            continue
        prefix, matrix = MATRIX[region]
        matrix_id = f"{prefix}-{CROP_CODES[data.previous_crop]}-{CROP_CODES[crop]}"
        page = 2 if prefix == "AQP" and data.previous_crop == "faba-bean" else 1
        for code in matrix[CROPS.index(data.previous_crop)][CROPS.index(crop)].split():
            sources = []
            if len(code) == 2:
                url, title, section = SOURCES[code[1]]
                sources.append(RuleSource(url=url, title=title, section=section))
            notes.append(
                RegionalNote(
                    crop_id=crop,
                    state=STATES[code[0]],
                    message=MESSAGES[code[0]],
                    matrix_id=matrix_id,
                    matrix_page=page,
                    sources=sources,
                )
            )
    return notes


def plot_notes(data: RotationInput) -> list[PlotNote]:
    answers = data.planting_answers
    if answers is None:
        return []
    notes = []
    if answers.ponding in {"yes", "sometimes"}:
        notes.append(
            PlotNote(
                state="attention",
                message="Indicaste que a veces queda agua acumulada. Revisa cómo sale el agua de tu terreno antes de sembrar.",
            )
        )
    if answers.water == "unknown":
        notes.append(
            PlotNote(
                state="missing_data",
                message="Confirmar de dónde vendrá el agua ayudará a planificar la próxima siembra.",
            )
        )
    if data.soil_ph is None or not (answers.ph_date and answers.ph_method):
        notes.append(
            PlotNote(
                state="missing_data",
                message="Si tienes un análisis del suelo, registra el resultado con su fecha y método para poder contrastarlo.",
            )
        )
    return notes
