"""Versioned bibliography for the preliminary Illpa INIA assessment."""

import json

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

VERSION = "illpa-inia-ilave-v1"
ILLPA_TITLE = "INIA · Quinua Illpa INIA"
ILLPA_URL = "https://repositorio.inia.gob.pe/handle/20.500.12955/79"
ADAPTATION = "Página 1 del PDF · Adaptación agroecológica"
ILLPA_SCOPE = "Cultivar Illpa INIA, referencia de adaptación del Altiplano puneño."


def upgrade():
    references = op.create_table(
        "bibliographic_references",
        sa.Column("version", sa.String(64), primary_key=True),
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("parameter", sa.String(160), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("unit", sa.String(32), nullable=True),
        sa.Column("scope", sa.String(500), nullable=False),
        sa.Column("source_title", sa.String(250), nullable=False),
        sa.Column("source_url", sa.String(500), nullable=False),
        sa.Column("source_section", sa.String(250), nullable=False),
    )
    rows = [
        (
            "sequence",
            "Antecedente agrícola",
            "Papa → quinua",
            None,
            "Secuencia descrita para Illpa INIA en el Altiplano puneño.",
            ILLPA_TITLE,
            ILLPA_URL,
            "Página 2 del PDF · Manejo del cultivo / Rotación",
        ),
        ("ph", "pH del suelo", [5.5, 8.0], "pH", ILLPA_SCOPE, ILLPA_TITLE, ILLPA_URL, ADAPTATION),
        (
            "texture",
            "Textura del suelo",
            ["loam", "sandy_loam"],
            None,
            ILLPA_SCOPE,
            ILLPA_TITLE,
            ILLPA_URL,
            ADAPTATION,
        ),
        (
            "drainage",
            "Drenaje de la parcela",
            "Suelo con buen drenaje",
            None,
            "Referencia general para quinua en Cusco, sin validación específica para Illpa INIA en Ilave.",
            "INIA · Manejo integrado del cultivo de quinua en el Cusco",
            "https://repositorio.inia.gob.pe/handle/20.500.12955/926",
            "Página impresa 14 (16 del PDF) · 8. Tipos de suelos para la producción de quinua",
        ),
        (
            "moisture",
            "Humedad en el establecimiento",
            "Humedad del suelo para la siembra",
            None,
            "Descripción cualitativa de la siembra de Illpa INIA en el Altiplano puneño.",
            ILLPA_TITLE,
            ILLPA_URL,
            "Página 2 del PDF · Manejo del cultivo / Época de siembra",
        ),
        (
            "precipitation",
            "Precipitación de referencia",
            [450, 600],
            "mm",
            ILLPA_SCOPE,
            ILLPA_TITLE,
            ILLPA_URL,
            ADAPTATION,
        ),
        (
            "temperature",
            "Temperatura de referencia",
            [4, 15],
            "°C",
            ILLPA_SCOPE,
            ILLPA_TITLE,
            ILLPA_URL,
            ADAPTATION,
        ),
    ]
    keys = (
        "id",
        "parameter",
        "value",
        "unit",
        "scope",
        "source_title",
        "source_url",
        "source_section",
    )
    entries = [dict(zip(keys, row, strict=True), version=VERSION) for row in rows]
    if op.get_context().as_sql:
        for entry in entries:
            entry["value"] = op.inline_literal(json.dumps(entry["value"], ensure_ascii=False))
    op.bulk_insert(references, entries, multiinsert=False)


def downgrade():
    op.drop_table("bibliographic_references")
