from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.agronomy import Rule, RuleSet
from app.schemas.rotation import CatalogRule, CatalogVersion


def approved_catalog(session: Session) -> CatalogVersion | None:
    version = session.scalar(
        select(RuleSet)
        .where(RuleSet.status == "approved")
        .order_by(RuleSet.reviewed_on.desc(), RuleSet.version.desc())
        .limit(1)
    )
    if version is None:
        return None
    rows = session.scalars(
        select(Rule)
        .where(Rule.rule_set_version == version.version, Rule.status == "approved")
        .order_by(Rule.id)
    ).all()
    return CatalogVersion(
        version=version.version,
        status=version.status,
        reviewed_on=version.reviewed_on,
        rules=[
            CatalogRule(
                id=row.id,
                crop_id=row.crop_id,
                previous_crop_id=row.previous_crop_id,
                criterion=row.criterion,
                predicate=row.predicate_json,
                weight=row.weight,
                critical=row.critical,
                regions=row.regions,
                geographic_context=row.geographic_context,
                source=row.source_json,
                status=row.status,
                reviewed_on=row.reviewed_on,
                limitation=row.limitation,
            )
            for row in rows
        ],
    )


def insert_version(session: Session, catalog: CatalogVersion) -> None:
    session.add(
        RuleSet(version=catalog.version, status=catalog.status, reviewed_on=catalog.reviewed_on)
    )
    session.flush()
    session.add_all(
        [
            Rule(
                rule_set_version=catalog.version,
                id=rule.id,
                crop_id=rule.crop_id,
                previous_crop_id=rule.previous_crop_id,
                criterion=rule.criterion,
                predicate_json=rule.predicate.model_dump(mode="json"),
                weight=rule.weight,
                critical=rule.critical,
                regions=rule.regions,
                geographic_context=rule.geographic_context,
                source_json=rule.source.model_dump(mode="json"),
                status=rule.status,
                reviewed_on=rule.reviewed_on,
                limitation=rule.limitation,
            )
            for rule in catalog.rules
        ]
    )
