import os
from datetime import date

import httpx
import pytest

from app.schemas.climate import Period
from app.services.climate import get_series


@pytest.mark.live
@pytest.mark.skipif(os.environ.get("AGRONEXA_LIVE") != "1", reason="Requiere AGRONEXA_LIVE=1 y red")
def test_ilave_2024_live(settings, sessions):
    period = Period(start=date(2024, 1, 1), end=date(2024, 12, 31))
    with httpx.Client(timeout=settings.nasa_timeout_seconds, follow_redirects=False) as client:
        result = get_series(sessions, client, settings, "puno-ilave", period, force=True)
    assert result.source.provider == "NASA POWER"
    assert result.source.cache_status == "fresh"
    assert result.source.metadata["http_status"] == 200
    assert result.source.time_standard == "LST"
    assert result.quality.expected_days == 366
    assert all(result.quality.valid_days_by_variable.values())
    assert result.series[59].date == date(2024, 2, 29)
