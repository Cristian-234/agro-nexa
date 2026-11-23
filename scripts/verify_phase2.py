"""Contrasta las respuestas HTTP con un cálculo independiente desde los CSV de 2024."""

import argparse
import csv
import hashlib
import json
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
VARIABLES = {
    "mean_temperature": "t2m_deg_c",
    "min_temperature": "t2m_min_deg_c",
    "max_temperature": "t2m_max_deg_c",
    "accumulated_precipitation": "prectotcorr_mm_day",
    "potential_frost_days": "t2m_min_deg_c",
    "rainy_days": "prectotcorr_mm_day",
}


def get(base, route, params):
    with urlopen(
        f"{base}/api/v1/climate/{route}?{urlencode(params, doseq=True)}", timeout=90
    ) as response:
        return json.load(response)


def csv_rows(folder, item):
    path = folder / item["csv"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item["csv_sha256"], path
    with path.open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def manual(code, values, rain_threshold):
    if code == "mean_temperature":
        return sum(values) / len(values)
    if code == "min_temperature":
        return min(values)
    if code == "max_temperature":
        return max(values)
    if code == "accumulated_precipitation":
        return sum(values)
    if code == "potential_frost_days":
        return sum(value <= 0 for value in values)
    return sum(value >= rain_threshold for value in values)


def verify_value(actual, expected):
    # Acepta ambos sentidos del empate exacto a media décima.
    assert abs(Decimal(str(actual)) - expected) <= Decimal("0.05"), (actual, str(expected))


def verify(base, evidence):
    manifest = json.loads(
        (evidence / "manifest_2024-01-01_2024-12-31.json").read_text(encoding="utf-8")
    )
    period = manifest["period"]
    start = date.fromisoformat(period["start"])
    end = date.fromisoformat(period["end"])
    calendar = [(start + timedelta(days=i)).isoformat() for i in range((end - start).days + 1)]
    rows_by_id, summary_results, source_results = {}, {}, {}
    group_checks = indicator_checks = 0
    for item in manifest["results"]:
        assert item["status"] == "ok" and item["source"]["metadata"]["http_status"] == 200
        location = item["location_id"]
        rows = csv_rows(evidence, item)
        rows_by_id[location] = rows
        assert [row["date"] for row in rows] == calendar
        assert all(row["location_id"] == location and row["source"] == "NASA POWER" for row in rows)
        assert all(row[column] != "" for row in rows for column in VARIABLES.values())
        for grouping, date_prefix in {"period": 0, "year": 4, "month": 7}.items():
            expected_groups = defaultdict(list)
            for row in rows:
                expected_groups[row["date"][:date_prefix]].append(row)
            body = get(base, "summary", period | {"location_id": location, "group_by": grouping})
            source = body["source"]
            assert body["period"] == period and body["group_by"] == grouping
            assert source["response_sha256"] == item["source"]["response_sha256"], location
            assert source["time_standard"] == "LST" and source["cache_status"] == "cached"
            assert len(body["groups"]) == len(expected_groups)
            threshold = Decimal(str(body["rain_day_threshold_mm"]))
            for group, data in zip(body["groups"], expected_groups.values(), strict=True):
                assert group["period"] == {"start": data[0]["date"], "end": data[-1]["date"]}
                assert group["indicators"].keys() == VARIABLES.keys()
                for code, column in VARIABLES.items():
                    actual = group["indicators"][code]
                    values = [Decimal(row[column]) for row in data]
                    verify_value(actual["value"], manual(code, values, threshold))
                    assert actual["valid_days"] == actual["expected_days"] == len(data)
                    assert actual["coverage_pct"] == 100 and actual["status"] == "complete"
                    indicator_checks += 1
                group_checks += 1
            if grouping == "period":
                summary_results[location] = {
                    code: result["value"]
                    for code, result in body["groups"][0]["indicators"].items()
                }
                source_results[location] = {
                    "response_sha256": source["response_sha256"],
                    "csv_sha256": item["csv_sha256"],
                    "fetched_at_utc": source["fetched_at"],
                }

    ids = list(rows_by_id)
    assert len(ids) == 3
    comparison = get(base, "compare", period | {"location_ids": ids})
    assert comparison["aligned_period"] == period
    assert [location["location_id"] for location in comparison["locations"]] == ids
    assert [(pair["location_a"], pair["location_b"]) for pair in comparison["comparisons"]] == [
        (ids[0], ids[1]),
        (ids[0], ids[2]),
        (ids[1], ids[2]),
    ]
    threshold = Decimal(str(comparison["locations"][0]["rain_day_threshold_mm"]))
    comparison_results = {}
    for pair in comparison["comparisons"]:
        a, b = pair["location_a"], pair["location_b"]
        differences = {}
        assert pair["differences"].keys() == VARIABLES.keys()
        for code, column in VARIABLES.items():
            left = [Decimal(row[column]) for row in rows_by_id[a]]
            right = [Decimal(row[column]) for row in rows_by_id[b]]
            actual = pair["differences"][code]
            verify_value(
                actual["value"], manual(code, left, threshold) - manual(code, right, threshold)
            )
            assert actual["status"] == "available" and actual["common_valid_days"] == len(calendar)
            assert actual["common_coverage_pct"] == 100
            differences[code] = actual["value"]
        comparison_results[f"{a} - {b}"] = differences
    return {
        "period": period,
        "days": len(calendar),
        "groups_checked": group_checks,
        "indicators_checked": indicator_checks,
        "differences_checked": sum(map(len, comparison_results.values())),
        "sources": source_results,
        "period_indicators": summary_results,
        "period_differences": comparison_results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--evidence", type=Path, default=ROOT / "docs" / "evidence" / "phase2")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    report = json.dumps(
        verify(args.base_url.rstrip("/"), args.evidence), ensure_ascii=False, indent=2
    )
    if args.report:
        args.report.write_text(report + "\n", encoding="utf-8")
    print(report)
