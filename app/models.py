from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class SKUAnalysisRequest(BaseModel):
    product_name: str = Field(min_length=2, max_length=100)
    launch_scenario: Literal["standard", "cold_start", "rebrand"] = "standard"
    category: str
    product_family: str = "Hydration"
    formula_type: str
    viscosity: float = Field(ge=50, le=100_000)
    fill_volume_ml: float = Field(ge=1, le=2_000)
    package_type: str
    container_type: str
    closure_type: str
    filling_technology: str
    decoration: str
    process_complexity: Literal["Low", "Medium", "High"]
    compounding_required: bool = True
    previous_product: str = "Hydrating Serum"
    previous_product_category: str = "Skincare"
    planned_batch_quantity: int = Field(ge=500, le=2_000_000)
    run_sequence: int = Field(ge=1, le=20)
    campaign_position: int = Field(ge=1, le=30)
    days_since_prior_run: int = Field(ge=0, le=365)
    days_since_last_pm: int = Field(ge=0, le=365)
    labor_assumption: int = Field(default=6, ge=2, le=20)

    @field_validator(
        "category", "product_family", "formula_type", "package_type",
        "container_type", "closure_type", "filling_technology", "decoration",
        "previous_product", "previous_product_category",
    )
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return value.strip()


class LLMTestRequest(BaseModel):
    api_key: str = Field(min_length=1)
    endpoint: str
    model: str = "gemini-2.0-flash"


class LLMExplainRequest(LLMTestRequest):
    analysis_id: str
    prompt_type: Literal["recommendation", "risk", "comparison"] = "recommendation"
