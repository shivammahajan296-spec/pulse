from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.data.synthetic_data import COMPOUNDING_LINES, FILLING_LINES, LAUNCH_RECORDS
from app.services.eligibility import evaluate_compounding, evaluate_filling
from app.services.explainability import drivers, rationale, sensitivities
from app.services.predictor import predict
from app.services.ranking import rank
from app.services.risk_engine import evaluate_risks
from app.services.similarity import find_similar


ANALYSES: dict[str, dict[str, Any]] = {}


def analyze(product: dict[str, Any]) -> dict[str, Any]:
    eligible, excluded = evaluate_filling(product, FILLING_LINES)
    compounding, compounding_excluded = evaluate_compounding(product, COMPOUNDING_LINES)
    candidates = []
    for line in eligible:
        refs = find_similar(product, line["line_id"], LAUNCH_RECORDS)
        predictions = predict(product, line, refs)
        candidates.append({
            "line_id": line["line_id"], "line_name": line["line_name"], "line": line,
            "predictions": predictions, "uncertainty": {"level": predictions["uncertainty_level"], "reference_count": predictions["reference_count"]},
            "risk_flags": evaluate_risks(product, line, predictions), "similar_launches": refs,
        })
    ranked = rank(candidates)
    recommended = ranked[0] if ranked else None
    runner_up = ranked[1] if len(ranked) > 1 else None
    positives, negatives = drivers(product, recommended) if recommended else ([], [])
    analysis_id = f"AN-{datetime.now(timezone.utc).year}-{uuid4().hex[:6].upper()}"
    response = {
        "analysis_id": analysis_id, "created_at": datetime.now(timezone.utc).isoformat(), "product": product,
        "eligible_lines": [{"line_id": l["line_id"], "line_name": l["line_name"]} for l in eligible],
        "excluded_lines": excluded, "compounding_candidates": compounding, "compounding_excluded": compounding_excluded,
        "ranked_lines": ranked,
        "recommended_line": ({"line_id": recommended["line_id"], "line_name": recommended["line_name"], "score": recommended["score"]} if recommended else None),
        "runner_up": ({"line_id": runner_up["line_id"], "line_name": runner_up["line_name"], "score": runner_up["score"]} if runner_up else None),
        "rationale": rationale(recommended, runner_up) if recommended else "No filling line met every deterministic eligibility rule.",
        "recommendation_drivers": {"positive": positives, "negative": negatives},
        "what_would_change": sensitivities(product, ranked, excluded),
        "methodology": {"eligibility": "Deterministic physical-capability rules", "similarity": "Line-specific weighted nearest launches", "prediction": "Deterministic synthetic startup estimator", "uncertainty": "Evidence-density and volatility calibrated interval", "ranking_weights": {"OEE": 25, "Throughput": 15, "Scrap": 15, "Compatibility": 15, "Experience": 10, "Uncertainty": 8, "Changeover": 7, "Labor": 5}},
    }
    ANALYSES[analysis_id] = response
    if len(ANALYSES) > 100:
        ANALYSES.pop(next(iter(ANALYSES)))
    return response

