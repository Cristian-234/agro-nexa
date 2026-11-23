import argparse
from datetime import datetime
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.core.config import Settings
from app.db.session import make_sessions
from app.repositories.agronomy import insert_version
from app.schemas.rotation import CatalogVersion
from app.services.climate import PERU


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Incorpora una versión documentada del catálogo agronómico."
    )
    parser.add_argument("catalog", type=Path)
    args = parser.parse_args()
    try:
        catalog = CatalogVersion.model_validate_json(args.catalog.read_bytes())
    except (OSError, ValidationError) as exc:
        parser.error(f"No se pudo leer un catálogo válido. {exc}")
    today = datetime.now(PERU).date()
    dates = [catalog.reviewed_on, *(rule.reviewed_on for rule in catalog.rules)]
    if any(date is not None and date > today for date in dates):
        parser.error("Las fechas de revisión no pueden estar en el futuro.")
    sessions = make_sessions(Settings().database_url)
    try:
        with sessions.begin() as session:
            insert_version(session, catalog)
    except IntegrityError:
        parser.error("No se incorporó la versión. Verifica el catálogo y que la versión sea nueva.")
    print(f"Versión {catalog.version} incorporada con estado {catalog.status}.")


if __name__ == "__main__":
    main()
