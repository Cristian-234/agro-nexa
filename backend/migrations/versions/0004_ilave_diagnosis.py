"""Publish the Ilave diagnosis as a new bibliographic version."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

VERSION = "illpa-inia-ilave-v2"


def upgrade():
    op.add_column("bibliographic_references", sa.Column("source_issuer", sa.String(160)))
    op.add_column("bibliographic_references", sa.Column("source_year", sa.Integer()))
    op.add_column("bibliographic_references", sa.Column("verification", sa.String(32)))
    op.add_column("bibliographic_references", sa.Column("criterion_type", sa.String(32)))
    op.add_column("bibliographic_references", sa.Column("location_id", sa.String(64)))
    op.add_column("bibliographic_references", sa.Column("cultivar", sa.String(32)))
    references = sa.table(
        "bibliographic_references",
        *(
            sa.column(name)
            for name in (
                "version",
                "id",
                "parameter",
                "value",
                "unit",
                "scope",
                "source_title",
                "source_url",
                "source_section",
                "source_issuer",
                "source_year",
                "verification",
                "criterion_type",
                "location_id",
                "cultivar",
            )
        ),
    )
    columns = references.c
    drainage = columns.id == "drainage"
    op.execute(
        references.insert().from_select(
            list(columns.keys()),
            sa.select(
                sa.literal(VERSION),
                columns.id,
                columns.parameter,
                columns.value,
                columns.unit,
                columns.scope,
                columns.source_title,
                columns.source_url,
                sa.case(
                    (
                        drainage,
                        "Página impresa 14 (16 del PDF) · 8. Tipos de suelos para la producción de quinua",
                    ),
                    (
                        columns.id == "moisture",
                        "Página 2 del PDF · Sistema de producción y Época de siembra",
                    ),
                    else_=columns.source_section,
                ),
                sa.literal("Instituto Nacional de Innovación Agraria (INIA)"),
                sa.case((drainage, 2018), else_=2013),
                sa.literal("verified_in_primary_source"),
                sa.case(
                    (columns.id.in_(("sequence", "ph", "texture")), "candidate_rule"),
                    (columns.id.in_(("moisture", "drainage")), "not_evaluable"),
                    else_="documentary_reference",
                ),
                sa.literal("puno-ilave"),
                sa.literal("illpa_inia"),
            ).where(columns.version == "illpa-inia-ilave-v1"),
        )
    )


def downgrade():
    references = sa.table("bibliographic_references", sa.column("version"))
    op.execute(references.delete().where(references.c.version == VERSION))
    for name in (
        "cultivar",
        "location_id",
        "criterion_type",
        "verification",
        "source_year",
        "source_issuer",
    ):
        op.drop_column("bibliographic_references", name)
