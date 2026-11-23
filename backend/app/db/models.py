from datetime import date, datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_location_latitude"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_location_longitude"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    region: Mapped[str] = mapped_column(String(80))
    latitude: Mapped[float]
    longitude: Mapped[float]
    coordinate_source: Mapped[str] = mapped_column(String(500))
    verified: Mapped[bool]


class Dataset(Base):
    __tablename__ = "datasets"
    __table_args__ = (UniqueConstraint("provider", "product", "version", "temporal_standard"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(80))
    product: Mapped[str] = mapped_column(String(80))
    version: Mapped[str] = mapped_column(String(80))
    resolution_text: Mapped[str] = mapped_column(String(250))
    temporal_standard: Mapped[str] = mapped_column(String(16))
    documentation_url: Mapped[str] = mapped_column(String(250))


class Variable(Base):
    __tablename__ = "variables"
    __table_args__ = (UniqueConstraint("dataset_id", "code"),)

    id: Mapped[str] = mapped_column(String(90), primary_key=True)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"))
    code: Mapped[str] = mapped_column(String(20))
    unit: Mapped[str] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(String(250))


class FetchRun(Base):
    __tablename__ = "fetch_runs"
    __table_args__ = (
        CheckConstraint("start_date <= end_date", name="ck_fetch_period"),
        Index("ix_fetch_request_time", "request_key", "fetched_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[str] = mapped_column(ForeignKey("locations.id"))
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"))
    start_date: Mapped[date]
    end_date: Mapped[date]
    request_key: Mapped[str] = mapped_column(String(64))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20))
    metadata_json: Mapped[dict] = mapped_column(JSON)
    response_hash: Mapped[str] = mapped_column(String(64))
    snapshot: Mapped[list] = mapped_column(JSON)


class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        UniqueConstraint("location_id", "variable_id", "date"),
        Index("ix_observations_location_date", "location_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[str] = mapped_column(ForeignKey("locations.id"))
    variable_id: Mapped[str] = mapped_column(ForeignKey("variables.id"))
    date: Mapped[date]
    value: Mapped[float | None]
    quality_flag: Mapped[str] = mapped_column(String(80))
    fetch_run_id: Mapped[int] = mapped_column(ForeignKey("fetch_runs.id"))
