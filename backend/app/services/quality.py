from datetime import timedelta

import numpy as np
import pandas as pd

from app.providers.nasa_power import UNITS, Download
from app.schemas.climate import Period


def normalize(download: Download, period: Period) -> list[dict]:
    # Use date arithmetic first to avoid pandas Timestamp limits for ISO dates.
    days = (period.end - period.start).days + 1
    dates = [period.start + timedelta(days=i) for i in range(days)]
    keys = [day.isoformat().replace("-", "") for day in dates]
    values = pd.DataFrame(index=keys, columns=list(UNITS), dtype=float)
    flags = pd.DataFrame("", index=keys, columns=list(UNITS))
    for code in UNITS:
        if code not in download.values:
            flags[code] = "variable_missing"
            continue
        raw = pd.Series(download.values[code], dtype=object).reindex(keys)
        numeric = pd.to_numeric(raw, errors="coerce").astype(float)
        missing = raw.isna() & ~raw.index.isin(download.values[code])
        fill = numeric.eq(download.fill_value)
        invalid = ~np.isfinite(numeric) | raw.map(lambda value: type(value) not in (int, float))
        flags.loc[missing, code] = "day_missing"
        flags.loc[invalid & ~missing, code] = "invalid_value"
        flags.loc[fill & ~invalid, code] = "fill_value"
        excluded = invalid | fill
        if code == "PRECTOTCORR":
            negative = numeric.lt(0) & ~excluded
            flags.loc[negative, code] = "negative_precipitation"
            excluded |= negative
        values[code] = numeric.mask(excluded)

    inverted = values["T2M_MIN"].gt(values["T2M_MAX"])
    flags.loc[inverted, ["T2M_MIN", "T2M_MAX"]] = "inverted_temperature_bounds"
    outside = values["T2M"].lt(values["T2M_MIN"]) | values["T2M"].gt(values["T2M_MAX"])
    flags.loc[outside & ~inverted, "T2M"] = "mean_outside_temperature_bounds"
    return [
        {
            "date": day.isoformat(),
            **{
                code.lower(): float(value) if pd.notna(value) else None
                for code, value in zip(UNITS, row, strict=True)
            },
            "quality_flags": {
                code.lower(): flag for code, flag in zip(UNITS, row_flags, strict=True) if flag
            },
        }
        for day, row, row_flags in zip(
            dates,
            values.itertuples(index=False, name=None),
            flags.itertuples(index=False, name=None),
            strict=True,
        )
    ]
