from datetime import date

from sqlalchemy import JSON, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base


class Crop(Base):
    __tablename__ = "crops"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name_es: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(250))
    source_url: Mapped[str | None] = mapped_column(String(500))
    profile: Mapped[dict | None] = mapped_column(JSON)


class BibliographicReference(Base):
    __tablename__ = "bibliographic_references"

    version: Mapped[str] = mapped_column(String(64), primary_key=True)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    parameter: Mapped[str] = mapped_column(String(160))
    value: Mapped[str | list] = mapped_column(JSON)
    unit: Mapped[str | None] = mapped_column(String(32))
    scope: Mapped[str] = mapped_column(String(500))
    source_title: Mapped[str] = mapped_column(String(250))
    source_url: Mapped[str] = mapped_column(String(500))
    source_section: Mapped[str] = mapped_column(String(250))
    source_issuer: Mapped[str | None] = mapped_column(String(160))
    source_year: Mapped[int | None]
    verification: Mapped[str | None] = mapped_column(String(32))
    criterion_type: Mapped[str | None] = mapped_column(String(32))
    location_id: Mapped[str | None] = mapped_column(String(64))
    cultivar: Mapped[str | None] = mapped_column(String(32))


class RuleSet(Base):
    __tablename__ = "rule_sets"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'reviewed', 'approved')", name="ck_ruleset_status"),
        CheckConstraint(
            "status <> 'approved' OR reviewed_on IS NOT NULL", name="ck_ruleset_review"
        ),
    )

    version: Mapped[str] = mapped_column(String(64), primary_key=True)
    status: Mapped[str] = mapped_column(String(16))
    reviewed_on: Mapped[date | None]


class Rule(Base):
    __tablename__ = "rules"
    __table_args__ = (
        CheckConstraint("weight > 0", name="ck_rule_weight"),
        CheckConstraint("status IN ('draft', 'reviewed', 'approved')", name="ck_rule_status"),
        CheckConstraint("status <> 'approved' OR reviewed_on IS NOT NULL", name="ck_rule_review"),
    )

    rule_set_version: Mapped[str] = mapped_column(ForeignKey("rule_sets.version"), primary_key=True)
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    crop_id: Mapped[str] = mapped_column(ForeignKey("crops.id"))
    previous_crop_id: Mapped[str | None] = mapped_column(ForeignKey("crops.id"))
    criterion: Mapped[str] = mapped_column(String(250))
    predicate_json: Mapped[dict] = mapped_column(JSON)
    weight: Mapped[float]
    critical: Mapped[bool]
    source_json: Mapped[dict] = mapped_column(JSON)
    regions: Mapped[list] = mapped_column(JSON)
    geographic_context: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(16))
    reviewed_on: Mapped[date | None]
    limitation: Mapped[str] = mapped_column(String(500))
