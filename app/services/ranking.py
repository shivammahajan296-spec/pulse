from __future__ import annotations

from typing import Any


WEIGHTS = {"oee": 25, "throughput": 15, "scrap": 15, "compatibility": 15, "experience": 10, "uncertainty": 8, "changeover": 7, "labor": 5}


def rank(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not candidates:
        return []
    max_tp = max(c["predictions"]["throughput_units_hr"] for c in candidates)
    min_tp = min(c["predictions"]["throughput_units_hr"] for c in candidates)
    spread = max(1, max_tp-min_tp)
    for item in candidates:
        p = item["predictions"]
        normalized = {
            "oee": max(0, min(1, (p["oee"]-55)/35)),
            "throughput": .55 + .45*(p["throughput_units_hr"]-min_tp)/spread,
            "scrap": max(0, min(1, (7-p["scrap_pct"])/6)),
            "compatibility": p["compatibility"]/100,
            "experience": p["experience"]/100,
            "uncertainty": max(0, min(1, (9-p["uncertainty_width"])/7)),
            "changeover": max(0, min(1, (130-p["changeover_minutes"])/100)),
            "labor": max(0, min(1, (11-p["labor_required"])/8)),
        }
        components = {key: round(normalized[key]*weight, 1) for key, weight in WEIGHTS.items()}
        item["score_components"] = components
        item["score"] = round(sum(components.values()), 1)
    candidates.sort(key=lambda c: c["score"], reverse=True)
    for i, candidate in enumerate(candidates, 1):
        candidate["rank"] = i
    return candidates

