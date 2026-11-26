"""Expand the crop catalog with documentary profiles."""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def profile(scientific_name, family, introduction, icon, varieties, url, title, section, *related):
    return {
        "scientific_name": scientific_name,
        "family": family,
        "introduction": introduction,
        "icon": icon,
        "varieties": varieties,
        "references": [
            {"url": link, "title": name, "section": part}
            for link, name, part in ((url, title, section), *related)
        ],
        "evaluation_status": "documentary_only",
    }


def upgrade():
    op.add_column("crops", sa.Column("profile", sa.JSON(), nullable=True))
    crops = sa.table(
        "crops",
        sa.column("id", sa.String()),
        sa.column("name_es", sa.String()),
        sa.column("description", sa.String()),
        sa.column("source_url", sa.String()),
        sa.column("profile", sa.JSON()),
    )
    for key, content in {
        "potato": profile(
            "Solanum tuberosum",
            "Solanaceae",
            "Cultivo del que se cosechan tubérculos.",
            "🥔",
            ["INIA 311 Pallay Poncho"],
            "https://repositorio.inia.gob.pe/handle/20.500.12955/1146",
            "INIA · Manual técnico de manejo integrado del cultivo de papa",
            "Manejo del cultivo",
            (
                "https://repositorio.inia.gob.pe/items/234abbfe-0fd0-4266-868b-8d1674f6050b/full",
                "INIA · Papa INIA 311 Pallay Poncho",
                "Ficha varietal",
            ),
        ),
        "quinoa": profile(
            "Chenopodium quinoa",
            "Amaranthaceae",
            "Cultivo andino que se cosecha por su grano.",
            "🌱",
            ["Illpa INIA"],
            "https://repositorio.inia.gob.pe/handle/20.500.12955/79",
            "INIA · Quinua Illpa INIA",
            "Adaptación y manejo",
        ),
    }.items():
        op.execute(crops.update().where(crops.c.id == key).values(profile=content))

    barley_url = "https://repositorio.inia.gob.pe/items/54783374-187d-4cbd-9d2e-f6a10d1ca4f0"
    bean_url = "https://agropuno.gob.pe/Archivos/Biblioteca/manual_mip_haba.pdf#page=18"
    op.bulk_insert(
        crops,
        [
            {
                "id": "barley",
                "name_es": "Cebada",
                "description": "Hordeum vulgare",
                "source_url": barley_url,
                "profile": profile(
                    "Hordeum vulgare",
                    "Poaceae",
                    "Cereal que se puede cultivar para obtener grano.",
                    "🌾",
                    ["INIA 447 Luzmalta"],
                    barley_url,
                    "INIA · Cebada INIA 447 Luzmalta",
                    "Adaptación, siembra y rotación",
                ),
            },
            {
                "id": "faba-bean",
                "name_es": "Haba",
                "description": "Vicia faba",
                "source_url": bean_url,
                "profile": profile(
                    "Vicia faba",
                    "Fabaceae",
                    "Leguminosa que produce semillas dentro de vainas.",
                    "🫛",
                    ["INIA 401-Cusco", "INIA 417 Hinan Mamacha"],
                    bean_url,
                    "DRA Puno · Manual de manejo integrado de plagas y enfermedades en haba",
                    "Rotación de cultivos, p. 18",
                    (
                        "https://repositorio.inia.gob.pe/items/e4eef787-0290-4124-bb51-9230c3c72ea1",
                        "INIA · Haba INIA 401-Cusco",
                        "Ficha varietal",
                    ),
                    (
                        "https://repositorio.inia.gob.pe/items/f928f65e-c747-4a6c-bb0e-f81f28076e68",
                        "INIA · Haba INIA 417 Hinan Mamacha",
                        "Certificado de obtentor",
                    ),
                ),
            },
        ],
    )


def downgrade():
    referenced = op.get_bind().scalar(
        sa.text(
            "SELECT COUNT(*) FROM rules WHERE crop_id IN ('barley', 'faba-bean') "
            "OR previous_crop_id IN ('barley', 'faba-bean')"
        )
    )
    if referenced:
        raise RuntimeError("La reversión eliminaría cultivos vinculados a reglas agronómicas.")
    op.execute(sa.text("DELETE FROM crops WHERE id IN ('barley', 'faba-bean')"))
    op.drop_column("crops", "profile")
