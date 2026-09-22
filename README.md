# Project PULSE — NPL Predictive Performance

Project PULSE is a working proof-of-concept decision-support application for cold-start manufacturing line selection. It evaluates a brand-new SKU by its product attributes, line capabilities, operating context, and line-specific startup evidence to recommend both filling and (when required) compounding equipment.

The application uses synthetic, reproducible data representing 420 SKUs, 130 formulas, 12 filling lines, 5 compounding lines, and 22,708 production runs across three years. It does not contain or require production manufacturing data.

## Architecture

- **FastAPI / Pydantic backend** provides typed API endpoints and in-memory analysis retrieval.
- **Modular decision services** separate eligibility, historical similarity, KPI prediction, uncertainty, risks, ranking, and explainability.
- **Vanilla HTML, CSS, and JavaScript frontend** provides seven responsive views with no frontend framework.
- **Optional Straive LLMFoundry integration** creates only narrative explanations. It never affects eligibility, predictions, intervals, risk thresholds, or ranking.

The core flow is:

`New SKU → deterministic eligibility → SKU × line features → weighted historical similarity → startup KPI prediction → calibrated intervals → risks → composite ranking → recommendation`

## Setup and run

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

No database, Docker image, config file, or environment variable is required. The app works fully without LLM access.

## API

- `GET /api/health`
- `GET /api/lines`
- `GET /api/sample-skus`
- `GET /api/model-info`
- `POST /api/analyze`
- `GET /api/analysis/{analysis_id}`
- `GET /api/reference-launches/{line_id}`
- `POST /api/llm/test`
- `POST /api/llm/explain`

Interactive API documentation is available at `/docs` while the app is running.

## Modeling principles

### Cold start

SKU identity is not used. The prediction unit is the SKU attribute profile × line attributes × interaction and context features × historical startup outcomes.

### Startup window

Historical references represent first and early runs (run sequences 1–4), not blended lifetime averages. Startup learning, PM recency, previous-product transition, process complexity, and campaign context affect the estimates.

### Eligibility and similarity

Eligibility is deterministic and returns exact physical-capability failures. Similarity uses transparent, line-specific weighted nearest-launch retrieval. Filling technology, package, and viscosity receive more weight than broad category or family labels.

### Prediction and uncertainty

The POC estimator is lightweight and deterministic: identical inputs produce identical numeric results. Prediction intervals widen with low evidence density, weak capability centrality, low top-match similarity, and volatile reference outcomes. In a production implementation, these services can be replaced by trained gradient-boosted regressors plus conformal or quantile calibration.

### Validation

Model evaluation must hold out a complete SKU-line launch group. Random row-level splits are intentionally rejected because related runs from a launch would otherwise leak into both training and test data.

## Optional LLM configuration

Open **Settings**, enter the API key, optionally set a model name, and test the connection. The key is stored only in the browser's `sessionStorage`, sent only with the explicit LLM request, never logged, never returned, and never persisted by the backend. Clearing the browser session or clicking **Clear API key** removes it.

The LLM may generate a concise executive narrative. When it is absent or unavailable, deterministic explanations remain in place and the workflow is never blocked.

## Tests

```bash
python -m unittest discover -s tests -v
```

The test suite checks deterministic repeatability, data scale, exact eligibility exclusions, line ranking, historical evidence, uncertainty intervals, risks, and compounding results.

## Production evolution

The service boundaries are designed so real manufacturing master data, launch history, trained models, calibrated uncertainty estimators, and production constraints can replace the POC engines without rewriting the interface or API contract.
