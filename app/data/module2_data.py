from __future__ import annotations

from copy import deepcopy
from typing import Any


BASE_PLAN: dict[str, Any] = {
    "site": "ELC - Site 1",
    "horizon": "4 Weeks",
    "last_solved": "23-Sep-2026 10:24 AM",
    "metrics": {
        "current_cost": 12.4,
        "recommended_cost": 10.8,
        "changeovers_current": 68,
        "changeovers_recommended": 49,
        "setup_current": 142,
        "setup_recommended": 96,
        "inventory_current": 3.2,
        "inventory_recommended": 2.6,
        "utilisation_current": 72,
        "utilisation_recommended": 81,
        "production": 5.8,
        "full_cleans_current": 18,
        "full_cleans_recommended": 10,
    },
    "lines": [
        {"line": "F04", "eligible_skus": 62, "hours": [320, 340], "utilisation": [76, 86], "changeovers": [18, 12], "cost": [2.8, 2.4], "change": "Better sequence, higher batch sizes"},
        {"line": "F07", "eligible_skus": 58, "hours": [300, 320], "utilisation": [71, 82], "changeovers": [14, 8], "cost": [2.6, 2.2], "change": "Reduced changeovers, improved PV mix"},
        {"line": "F02", "eligible_skus": 55, "hours": [280, 310], "utilisation": [68, 80], "changeovers": [12, 9], "cost": [2.1, 1.8], "change": "Larger MOQs, fewer setups"},
        {"line": "F03", "eligible_skus": 40, "hours": [220, 250], "utilisation": [67, 76], "changeovers": [10, 8], "cost": [1.5, 1.3], "change": "Optimised sequence"},
        {"line": "F05", "eligible_skus": 38, "hours": [200, 230], "utilisation": [61, 72], "changeovers": [8, 7], "cost": [1.2, 1.0], "change": "Improved line balance"},
        {"line": "Others", "eligible_skus": 25, "hours": [180, 200], "utilisation": [58, 69], "changeovers": [6, 5], "cost": [1.2, 1.1], "change": "Minor adjustments"},
    ],
    "skus": [
        {"sku": "FND-001", "product": "Foundation", "pv": "PV-3", "alternatives": "PV-1, PV-2", "line": "F04", "unit_cost": 12.5, "rate": 600, "yield": 98, "total_cost": 24.8, "delta": -18, "moq": [20000, 50000], "setup": 120000, "holding": 0.80, "rationale": "Lower cost, higher run rate"},
        {"sku": "MSC-002", "product": "Mascara", "pv": "PV-1", "alternatives": "PV-2", "line": "F02", "unit_cost": 8.2, "rate": 480, "yield": 96, "total_cost": 18.1, "delta": 5, "moq": [15000, 40000], "setup": 95000, "holding": 0.60, "rationale": "Capacity constraint on PV-2"},
        {"sku": "LPG-003", "product": "Lip Gloss", "pv": "PV-2", "alternatives": "PV-1, PV-3", "line": "F05", "unit_cost": 6.8, "rate": 520, "yield": 97, "total_cost": 12.4, "delta": -22, "moq": [10000, 35000], "setup": 80000, "holding": 0.50, "rationale": "Better yield and lower setup impact"},
        {"sku": "MST-004", "product": "Moisturizer", "pv": "PV-1", "alternatives": "PV-3", "line": "F07", "unit_cost": 10.1, "rate": 450, "yield": 95, "total_cost": 20.2, "delta": -15, "moq": [25000, 40000], "setup": 110000, "holding": 0.70, "rationale": "Lower cost and inventory"},
        {"sku": "CLN-005", "product": "Cleanser", "pv": "PV-2", "alternatives": "PV-1", "line": "F03", "unit_cost": 7.5, "rate": 500, "yield": 98, "total_cost": 11.9, "delta": 0, "moq": [20000, 20000], "setup": 60000, "holding": 0.40, "rationale": "Current PV optimal"},
        {"sku": "SUN-006", "product": "Sunscreen", "pv": "PV-3", "alternatives": "PV-1, PV-2", "line": "F07", "unit_cost": 9.1, "rate": 460, "yield": 96, "total_cost": 16.5, "delta": -20, "moq": [12000, 30000], "setup": 85000, "holding": 0.55, "rationale": "Improved line utilisation"},
        {"sku": "TNR-007", "product": "Toner", "pv": "PV-1", "alternatives": "PV-2", "line": "F05", "unit_cost": 6.3, "rate": 550, "yield": 97, "total_cost": 13.7, "delta": 8, "moq": [18000, 36000], "setup": 90000, "holding": 0.50, "rationale": "Higher demand stability"},
    ],
    "sequences": {
        "current": {
            "F04": ["Foundation", "Mascara", "Lip Gloss", "Foundation"],
            "F07": ["Sunscreen", "Moisturizer", "Cleanser", "Serum"],
            "F02": ["Lip Balm", "Foundation", "Mascara", "Toner"],
            "F03": ["Serum", "Sunscreen", "Moisturizer", "Foundation"],
            "F05": ["Cleanser", "Toner", "Lip Gloss", "Mascara"],
        },
        "recommended": {
            "F04": ["Foundation", "Lip Gloss", "Mascara", "Foundation"],
            "F07": ["Moisturizer", "Serum", "Sunscreen", "Cleanser"],
            "F02": ["Foundation", "Mascara", "Lip Balm", "Toner"],
            "F03": ["Sunscreen", "Cleanser", "Moisturizer", "Serum"],
            "F05": ["Toner", "Cleanser", "Lip Gloss", "Mascara"],
        },
    },
    "constraints": [
        {"id": "R-001", "name": "Cleaning validation (GMP)", "type": "Cleaning", "description": "Full clean required for specific transitions", "value": "As per matrix", "active": True, "impact": "High"},
        {"id": "R-002", "name": "Allergen carryover", "type": "Allergen", "description": "No back-to-back for allergenic ingredients", "value": "Category list", "active": True, "impact": "High"},
        {"id": "R-003", "name": "Colour family changeover", "type": "Colour", "description": "Mandatory clean between dark and light shades", "value": "Matrix", "active": True, "impact": "Medium"},
        {"id": "R-004", "name": "Campaign freeze period", "type": "Scheduling", "description": "No changes within freeze window", "value": "Last 3 days", "active": False, "impact": "Medium"},
        {"id": "R-005", "name": "Due date priority (strict)", "type": "Scheduling", "description": "High priority orders must meet due dates", "value": "Priority = 1", "active": False, "impact": "Medium"},
        {"id": "R-006", "name": "Shared equipment conflict", "type": "Equipment", "description": "Compounding line dependency", "value": "Shared lines list", "active": True, "impact": "High"},
        {"id": "R-007", "name": "Max campaign length", "type": "Process", "description": "Limit campaign duration per SKU", "value": "120 hrs", "active": False, "impact": "Low"},
        {"id": "R-008", "name": "Minimum campaign gap", "type": "Scheduling", "description": "Minimum idle time between same SKU", "value": "12 hrs", "active": False, "impact": "Low"},
        {"id": "R-009", "name": "Line availability", "type": "Capacity", "description": "Planned maintenance windows", "value": "Calendar", "active": True, "impact": "Medium"},
        {"id": "R-010", "name": "Batch size multiple", "type": "Process", "description": "Batch size must be in multiples of X", "value": "5,000 units", "active": False, "impact": "Low"},
        {"id": "R-011", "name": "Material shelf life", "type": "Inventory", "description": "Maximum time in stock", "value": "90 days", "active": False, "impact": "Low"},
        {"id": "R-012", "name": "Regulatory hold", "type": "Regulatory", "description": "Restricted SKUs", "value": "SKU list", "active": False, "impact": "High"},
    ],
}


def module2_plan() -> dict[str, Any]:
    return deepcopy(BASE_PLAN)


def solve_module2(options: dict[str, Any]) -> dict[str, Any]:
    plan = module2_plan()
    moq_adjustment = max(-50, min(50, int(options.get("moq_adjustment", 0))))
    active_constraints = max(0, min(12, int(options.get("active_constraints", 5))))
    strict_due_dates = bool(options.get("strict_due_dates", False))
    factor = moq_adjustment / 100
    metrics = plan["metrics"]
    metrics["recommended_cost"] = round(10.8 - factor * 0.9 + max(0, active_constraints - 5) * 0.05 + (0.15 if strict_due_dates else 0), 1)
    metrics["changeovers_recommended"] = max(38, round(49 - factor * 18 + (3 if strict_due_dates else 0)))
    metrics["setup_recommended"] = max(78, round(96 - factor * 32 + (4 if strict_due_dates else 0)))
    metrics["inventory_recommended"] = round(2.6 + factor * 0.8, 1)
    metrics["utilisation_recommended"] = max(70, min(89, round(81 + factor * 7)))
    plan["scenario"] = {
        "name": options.get("scenario_name", "Custom Scenario"),
        "moq_adjustment": moq_adjustment,
        "active_constraints": active_constraints,
        "strict_due_dates": strict_due_dates,
    }
    return plan
