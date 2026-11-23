from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]
NASA_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_DOCS = "https://power.larc.nasa.gov/docs/services/api/temporal/daily/"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    database_url: str = "sqlite:///./agronexa.sqlite3"
    nasa_power_base_url: Literal[NASA_URL] = NASA_URL
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    nasa_timeout_seconds: float = Field(20, gt=0, le=20)
    cache_ttl_hours: float = Field(720, gt=0)
    recent_cache_ttl_hours: float = Field(24, gt=0)
    min_data_coverage: float = Field(0.90, ge=0, le=1)
    rain_day_threshold_mm: float = Field(1.0, ge=0, allow_inf_nan=False)
    min_rule_coverage: float = Field(0.80, ge=0, le=1)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
