import json

from fixtures.rotation_demo import OUTPUT, build_fixtures


def test_rotation_demo_matches_real_motor_and_covers_comparison_and_restriction():
    payload = build_fixtures()
    assert json.loads(OUTPUT.read_text(encoding="utf-8")) == payload
    comparison, restriction = [case["result"] for case in payload]
    assert [
        (item["crop_id"], item["score"], item["rank"]) for item in comparison["alternatives"]
    ] == [("quinoa", 100, 1), ("potato", 66.7, 2)]
    quinoa = next(item for item in restriction["alternatives"] if item["crop_id"] == "quinoa")
    assert quinoa["state"] == "restriction_detected"
    assert quinoa["score"] is None and quinoa["rank"] is None
    assert any(rule["state"] == "fail" and rule["critical"] for rule in quinoa["criteria"])
    assert all(result["climate_source"] is None for result in (comparison, restriction))
