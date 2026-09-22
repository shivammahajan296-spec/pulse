from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from app.data.synthetic_data import FILLING_LINES, LAUNCH_RECORDS, dataset_summary
from app.models import LLMExplainRequest, LLMTestRequest, SKUAnalysisRequest
from app.services.analysis_service import ANALYSES, analyze
from app.services.llm_service import generate_explanation, test_connection
from app.services.ranking import WEIGHTS
from app.services.similarity import SIMILARITY_WEIGHTS


BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="Project PULSE", version="1.0.0", description="New Product Launch predictive performance POC")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
INDEX_HTML = (BASE_DIR / "templates" / "index.html").read_text(encoding="utf-8")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return HTMLResponse(INDEX_HTML)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "Project PULSE", "data_mode": "synthetic"}


@app.get("/api/lines")
async def lines():
    return FILLING_LINES


@app.get("/api/sample-skus")
async def sample_skus():
    seen = {}
    for launch in LAUNCH_RECORDS:
        seen.setdefault(launch["sku"], {k: launch[k] for k in ["sku", "product_name", "category", "formula_type", "viscosity", "fill_volume_ml", "package_type"]})
    return list(seen.values())[:24]


@app.get("/api/model-info")
async def model_info():
    return {"dataset": dataset_summary(), "ranking_weights": WEIGHTS, "similarity_weights": SIMILARITY_WEIGHTS, "principles": ["Cold-start attribute modeling — SKU identity is excluded", "Startup-window targets from run sequences 1–4", "Launch-group holdout validation prevents leakage", "Line-specific historical similarity evidence", "Deterministic, inspectable eligibility and ranking"]}


@app.post("/api/analyze")
async def analyze_sku(payload: SKUAnalysisRequest):
    return analyze(payload.model_dump())


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    if analysis_id not in ANALYSES:
        raise HTTPException(404, "Analysis not found")
    return ANALYSES[analysis_id]


@app.get("/api/reference-launches/{line_id}")
async def reference_launches(line_id: str):
    return [r for r in LAUNCH_RECORDS if r["line_id"] == line_id][:25]


@app.post("/api/llm/test")
async def llm_test(payload: LLMTestRequest):
    try:
        return await test_connection(payload.api_key, payload.endpoint, payload.model)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception:
        return {"connected": False, "message": "Connection failed. Check the key, model, and network access."}


@app.post("/api/llm/explain")
async def llm_explain(payload: LLMExplainRequest):
    analysis = ANALYSES.get(payload.analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")
    safe_context = f"Write an executive {payload.prompt_type} summary using only these facts: {analysis['rationale']} Risks: {[r['name'] for r in analysis['ranked_lines'][0]['risk_flags']] if analysis['ranked_lines'] else []}. Keep it under 100 words."
    try:
        explanation = await generate_explanation(payload.api_key, payload.endpoint, payload.model, safe_context)
        return {"explanation": explanation}
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception:
        raise HTTPException(502, "Narrative service is unavailable; deterministic analysis remains available.")
