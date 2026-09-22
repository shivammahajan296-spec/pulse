from __future__ import annotations

import statistics
from typing import Any

from app.data.synthetic_data import stable_unit


COMPLEXITY_PENALTY = {"Low": 0.0, "Medium": 1.3, "High": 3.2}


def _compatibility(product: dict[str, Any], line: dict[str, Any]) -> tuple[float, float]:
    center = (line["viscosity_min"] + line["viscosity_max"]) / 2
    half_range = (line["viscosity_max"] - line["viscosity_min"]) / 2
    centrality = max(0, 1 - abs(product["viscosity"] - center) / max(1, half_range))
    fill_center = (line["fill_min"] + line["fill_max"]) / 2
    fill_fit = max(0, 1 - abs(product["fill_volume_ml"] - fill_center) / max(1, (line["fill_max"] - line["fill_min"]) / 2))
    score = 72 + centrality * 14 + fill_fit * 6 + (product["category"] in line["category_experience"]) * 8
    return min(100, score), centrality


def predict(product: dict[str, Any], line: dict[str, Any], references: list[dict[str, Any]]) -> dict[str, Any]:
    compatibility, centrality = _compatibility(product, line)
    ref_count = sum(r["similarity_score"] >= 58 for r in references)
    median_oee = statistics.median(r["startup_oee"] for r in references) if references else line["baseline_oee"] - 8
    median_scrap = statistics.median(r["startup_scrap"] for r in references) if references else line["baseline_scrap"] + 1.8
    top_similarity = references[0]["similarity_score"] if references else 25
    experience = min(100, 42 + ref_count * 8 + top_similarity * .35 + (product["category"] in line["category_experience"]) * 10)
    startup_penalty = 7.2 / (max(1, product["run_sequence"]) ** .45)
    pm_penalty = max(0, product["days_since_last_pm"] - 28) * .07
    gap_penalty = min(2.5, product["days_since_prior_run"] * .035)
    complexity_penalty = COMPLEXITY_PENALTY[product["process_complexity"]]
    deterministic_noise = (stable_unit(product["product_name"], line["line_id"], product["viscosity"], product["fill_volume_ml"]) - .5) * 1.8
    oee = (line["baseline_oee"] * .48 + median_oee * .30 + compatibility * .18 + line["reliability"] * 4
           - startup_penalty - pm_penalty - gap_penalty - complexity_penalty + deterministic_noise)
    oee = max(52, min(89, oee))
    scrap = max(.7, line["baseline_scrap"] * .48 + median_scrap * .32 + (1-centrality) * 1.25 + startup_penalty * .12 + complexity_penalty * .18 + pm_penalty * .08)
    speed_factor = .78 + compatibility / 500 - complexity_penalty / 100
    line_speed = line["design_speed"] * speed_factor * (oee / max(line["baseline_oee"], 1))
    throughput = int(line_speed * 60 * oee / 100)
    overfill_risk = min(.55, max(.03, .06 + scrap / 35 + (1-centrality) * .11 + (product["filling_technology"] == "Gravity Filling") * .05))
    labor = line["baseline_labor"] + int(product["process_complexity"] == "High") + int(line["automation"] == "Low")
    transition = 18 if product["previous_product_category"] != product["category"] else 5
    package_change = 14 if not any(product["package_type"] == r["package_type"] for r in references[:2]) else 4
    cleaning = {"Serum": 12, "Lotion": 18, "Cream": 25, "Mascara": 32, "Lip Gloss": 28}.get(product["formula_type"], 18)
    changeover = int(27 + transition + package_change + cleaning + (product["decoration"] != "None") * 8 + (1-line["reliability"]) * 35)
    volatility = statistics.pstdev([r["startup_oee"] for r in references]) if len(references) > 1 else 5.0
    uncertainty_width = 2.3 + max(0, 5-ref_count) * .65 + (1-centrality)*2.3 + max(0, 75-top_similarity)*.045 + volatility*.12
    uncertainty_level = "Low" if uncertainty_width < 4.4 else "Medium" if uncertainty_width < 6.2 else "High"
    result = {
        "oee": round(oee, 1), "oee_interval": [round(max(40, oee-uncertainty_width), 1), round(min(96, oee+uncertainty_width*.88), 1)],
        "scrap_pct": round(scrap, 1), "scrap_interval": [round(max(.2, scrap-uncertainty_width*.15), 1), round(scrap+uncertainty_width*.18, 1)],
        "throughput_units_hr": throughput, "line_speed": round(line_speed, 1),
        "overfill_risk": round(overfill_risk, 2), "labor_required": labor,
        "changeover_minutes": changeover, "compatibility": round(compatibility, 1),
        "viscosity_centrality": round(centrality*100, 1), "experience": round(experience, 1),
        "reference_count": ref_count, "top_similarity": top_similarity,
        "comparable_median_oee": round(median_oee, 1), "comparable_median_scrap": round(median_scrap, 1),
        "uncertainty_width": round(uncertainty_width, 1), "uncertainty_level": uncertainty_level,
    }
    return result

