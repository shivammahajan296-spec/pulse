from __future__ import annotations

import math
from typing import Any


SIMILARITY_WEIGHTS = {
    "filling_technology": 0.19, "package_type": 0.16, "viscosity": 0.16,
    "formula_type": 0.12, "fill_volume_ml": 0.10, "closure_type": 0.09,
    "category": 0.07, "decoration": 0.06, "process_complexity": 0.05,
}


def _numeric_similarity(a: float, b: float, scale: float) -> float:
    return math.exp(-abs(a - b) / max(scale, 1))


def score_similarity(product: dict[str, Any], launch: dict[str, Any]) -> tuple[float, list[str], list[str]]:
    factors: dict[str, float] = {}
    common, differences = [], []
    for field in ["filling_technology", "package_type", "formula_type", "closure_type", "category", "decoration", "process_complexity"]:
        factors[field] = 1.0 if product[field].lower() == str(launch[field]).lower() else 0.0
        label = field.replace("_", " ")
        if factors[field]:
            common.append(f"Same {label}")
        else:
            differences.append(f"{label.title()}: {launch[field]}")
    factors["viscosity"] = _numeric_similarity(product["viscosity"], launch["viscosity"], max(2500, product["viscosity"] * .35))
    factors["fill_volume_ml"] = _numeric_similarity(product["fill_volume_ml"], launch["fill_volume_ml"], max(25, product["fill_volume_ml"] * .35))
    if factors["viscosity"] >= .82:
        common.append("Viscosity within close operating range")
    elif abs(product["viscosity"] - launch["viscosity"]) > 4000:
        differences.append(f"Viscosity differs by {abs(product['viscosity']-launch['viscosity']):,.0f} cP")
    if factors["fill_volume_ml"] >= .82:
        common.append("Similar fill volume")
    score = sum(factors[key] * weight for key, weight in SIMILARITY_WEIGHTS.items())
    return round(score * 100, 1), common[:4], differences[:3]


def find_similar(product: dict[str, Any], line_id: str, launches: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    candidates = []
    for launch in launches:
        if launch["line_id"] != line_id:
            continue
        score, common, differences = score_similarity(product, launch)
        candidates.append({**launch, "similarity_score": score, "common_attributes": common, "meaningful_differences": differences})
    return sorted(candidates, key=lambda x: x["similarity_score"], reverse=True)[:limit]

