from __future__ import annotations

from typing import Any


def drivers(product: dict[str, Any], recommended: dict[str, Any]) -> tuple[list[dict], list[dict]]:
    p = recommended["predictions"]
    positive = [
        {"factor": "Line compatibility", "impact": round((p["compatibility"]-70)*.23, 1), "detail": f"{p['compatibility']}% physical and process fit"},
        {"factor": "Comparable launch evidence", "impact": round(min(7.2, p["reference_count"]*1.15), 1), "detail": f"{p['reference_count']} close launches on this line"},
        {"factor": "Historical reliability", "impact": round(recommended["line"]["reliability"]*5.5, 1), "detail": f"{recommended['line']['reliability']*100:.0f}% historical reliability"},
        {"factor": "Package and technology match", "impact": 4.8, "detail": f"Exact {product['package_type']} / {product['filling_technology']} match"},
    ]
    negative = []
    if product["run_sequence"] <= 2:
        negative.append({"factor": "Early-run learning", "impact": -3.8, "detail": f"Run sequence {product['run_sequence']} retains startup penalty"})
    if p["uncertainty_level"] != "Low":
        negative.append({"factor": "Prediction uncertainty", "impact": -round(p["uncertainty_width"]*.55, 1), "detail": f"±{p['uncertainty_width']} OEE point range"})
    if p["changeover_minutes"] > 70:
        negative.append({"factor": "Product transition", "impact": -round((p["changeover_minutes"]-55)*.05, 1), "detail": f"{p['changeover_minutes']} minute modeled changeover"})
    if p["viscosity_centrality"] < 55:
        negative.append({"factor": "Viscosity envelope position", "impact": -round((55-p["viscosity_centrality"])*.06, 1), "detail": f"{p['viscosity_centrality']}% envelope centrality"})
    return positive, negative


def rationale(recommended: dict[str, Any], runner_up: dict[str, Any] | None) -> str:
    p = recommended["predictions"]
    lead = recommended["score"] - runner_up["score"] if runner_up else recommended["score"]
    return (f"{recommended['line_name']} is the strongest startup choice with {p['oee']}% expected OEE, "
            f"{p['scrap_pct']}% scrap and {p['throughput_units_hr']:,} units/hour. It combines {p['compatibility']}% "
            f"compatibility with {p['reference_count']} close line-specific launches and leads the next candidate by {lead:.1f} points.")


def sensitivities(product: dict[str, Any], ranked: list[dict[str, Any]], excluded: list[dict[str, Any]]) -> list[str]:
    result = []
    if len(ranked) > 1:
        result.append(f"If {ranked[0]['line_id']} is unavailable, {ranked[1]['line_id']} becomes the next-best option at a score of {ranked[1]['score']}.")
    volume_excluded = next((x for x in excluded if "Fill volume" in x["reason"]), None)
    if volume_excluded:
        result.append(f"A smaller or alternate fill format could bring {volume_excluded['line_id']} into the candidate set.")
    viscosity_excluded = next((x for x in excluded if "Viscosity" in x["reason"]), None)
    if viscosity_excluded:
        result.append(f"Adjusting viscosity toward the qualified envelope could make {viscosity_excluded['line_id']} eligible.")
    if product["previous_product_category"] != product["category"]:
        result.append("Sequencing after a product in the same category could reduce modeled changeover by approximately 13 minutes.")
    if ranked and ranked[0]["predictions"]["labor_required"] > product["labor_assumption"]:
        result.append(f"Relaxing the labor assumption to {ranked[0]['predictions']['labor_required']} operators removes the top line's staffing risk.")
    result.append("Additional successful launches with the same package and formula would narrow the prediction interval and strengthen the recommendation.")
    return result[:5]

