from __future__ import annotations

import hashlib
import math
import random
from datetime import date, timedelta
from typing import Any


SEED = 24021996


def _line(
    line_id: str, name: str, speed: int, automation: str, viscosity: tuple[int, int],
    volume: tuple[int, int], tech: list[str], packages: list[str], containers: list[str],
    closures: list[str], decoration: list[str], complexity: int, baseline_oee: float,
    scrap: float, labor: int, reliability: float, categories: list[str],
) -> dict[str, Any]:
    return {
        "line_id": line_id, "line_name": name, "stage": "Filling", "design_speed": speed,
        "automation": automation, "viscosity_min": viscosity[0], "viscosity_max": viscosity[1],
        "fill_min": volume[0], "fill_max": volume[1], "technologies": tech,
        "packages": packages, "containers": containers, "closures": closures,
        "decorations": decoration, "complexity_capability": complexity,
        "baseline_oee": baseline_oee, "baseline_scrap": scrap,
        "baseline_throughput": int(speed * 60 * baseline_oee / 100),
        "baseline_labor": labor, "reliability": reliability, "category_experience": categories,
    }


FILLING_LINES = [
    _line("F01", "Velocity Bottle Cell", 145, "High", (100, 18_000), (30, 500), ["Piston Filling", "Pump Filling", "Gravity Filling"], ["Bottle", "Airless Pump"], ["Plastic Bottle", "Glass Bottle"], ["Pump", "Cap", "Dropper"], ["None", "Label", "Screen Print"], 2, 78.5, 2.8, 5, .93, ["Skincare", "Lotion", "Serum"]),
    _line("F02", "FlexiFill Multi-format", 118, "Medium", (500, 35_000), (10, 300), ["Piston Filling", "Pump Filling", "Gravity Filling"], ["Bottle", "Jar", "Airless Pump"], ["Plastic Bottle", "Glass Bottle", "Jar"], ["Pump", "Cap", "Dropper"], ["None", "Label", "Screen Print", "Hot Stamp"], 3, 76.8, 3.1, 6, .90, ["Skincare", "Foundation", "Cream", "Serum"]),
    _line("F03", "Precision Glass Line", 102, "High", (50, 12_000), (5, 150), ["Pump Filling", "Gravity Filling"], ["Bottle", "Airless Pump"], ["Glass Bottle", "Plastic Bottle"], ["Pump", "Dropper", "Cap"], ["None", "Label", "Hot Stamp"], 2, 80.2, 2.4, 4, .95, ["Serum", "Foundation", "Skincare"]),
    _line("F04", "Piston Performance Line", 158, "High", (1_000, 32_000), (50, 500), ["Piston Filling", "Pump Filling"], ["Bottle", "Airless Pump", "Jar"], ["Plastic Bottle", "Glass Bottle", "Jar"], ["Pump", "Cap"], ["None", "Label", "Screen Print", "Sleeve"], 3, 82.0, 2.1, 5, .96, ["Lotion", "Cream", "Skincare"]),
    _line("F05", "TubeFlow 360", 132, "High", (5_000, 70_000), (15, 350), ["Tube Filling", "Hot Fill"], ["Tube"], ["Tube"], ["Flip Top", "Cap"], ["None", "Label", "Screen Print", "Carton-specific Requirement"], 3, 79.1, 2.7, 5, .92, ["Cream", "Lotion", "Lip Gloss"]),
    _line("F06", "HotFill Studio", 84, "Medium", (4_000, 55_000), (5, 250), ["Hot Fill", "Piston Filling"], ["Jar", "Tube"], ["Jar", "Tube"], ["Cap", "Flip Top"], ["None", "Label", "Hot Stamp"], 3, 73.9, 3.6, 7, .88, ["Cream", "Lip Gloss"]),
    _line("F07", "Compact Bottle Line", 110, "Medium", (100, 15_000), (5, 120), ["Pump Filling", "Gravity Filling"], ["Bottle"], ["Plastic Bottle", "Glass Bottle"], ["Pump", "Dropper", "Cap"], ["None", "Label"], 2, 75.0, 3.0, 5, .91, ["Serum", "Foundation"]),
    _line("F08", "Airless Pro", 126, "High", (800, 25_000), (15, 200), ["Piston Filling", "Pump Filling"], ["Airless Pump", "Bottle"], ["Plastic Bottle"], ["Pump"], ["None", "Label", "Screen Print"], 2, 81.0, 2.2, 4, .94, ["Skincare", "Lotion", "Foundation"]),
    _line("F09", "Mascara Cell", 72, "Medium", (8_000, 65_000), (3, 25), ["Mascara Filling"], ["Bottle"], ["Plastic Bottle"], ["Wand"], ["None", "Label", "Hot Stamp"], 3, 74.4, 3.5, 8, .89, ["Mascara"]),
    _line("F10", "Gloss Precision Cell", 88, "Medium", (5_000, 80_000), (3, 30), ["Piston Filling", "Hot Fill"], ["Bottle", "Tube"], ["Plastic Bottle", "Tube"], ["Wand", "Cap"], ["None", "Label", "Hot Stamp"], 3, 76.2, 3.4, 7, .90, ["Lip Gloss"]),
    _line("F11", "Jar Automation Line", 96, "High", (10_000, 90_000), (15, 500), ["Piston Filling", "Hot Fill"], ["Jar"], ["Jar"], ["Cap"], ["None", "Label", "Screen Print", "Hot Stamp"], 3, 78.7, 2.9, 5, .93, ["Cream", "Skincare"]),
    _line("F12", "Heritage Flexible Line", 65, "Low", (100, 60_000), (5, 750), ["Piston Filling", "Pump Filling", "Gravity Filling", "Hot Fill"], ["Bottle", "Jar", "Tube"], ["Plastic Bottle", "Glass Bottle", "Jar", "Tube"], ["Pump", "Cap", "Dropper", "Flip Top"], ["None", "Label"], 3, 69.8, 4.2, 9, .84, ["Skincare", "Lotion", "Cream", "Serum", "Foundation"]),
]

COMPOUNDING_LINES = [
    {"line_id": "C01", "line_name": "Compounding Vessel 01", "stage": "Compounding", "viscosity_min": 50, "viscosity_max": 20_000, "categories": ["Skincare", "Serum", "Foundation"], "complexity_capability": 2, "capacity_kg": 1200, "automation": "High", "baseline_oee": 84.0, "reliability": .96},
    {"line_id": "C02", "line_name": "Compounding Vessel 02", "stage": "Compounding", "viscosity_min": 2_000, "viscosity_max": 55_000, "categories": ["Skincare", "Lotion", "Foundation", "Cream"], "complexity_capability": 3, "capacity_kg": 2000, "automation": "High", "baseline_oee": 81.0, "reliability": .94},
    {"line_id": "C03", "line_name": "High Shear Vessel 03", "stage": "Compounding", "viscosity_min": 8_000, "viscosity_max": 100_000, "categories": ["Cream", "Mascara", "Lip Gloss"], "complexity_capability": 3, "capacity_kg": 900, "automation": "Medium", "baseline_oee": 77.0, "reliability": .91},
    {"line_id": "C04", "line_name": "Color Cosmetics Vessel 04", "stage": "Compounding", "viscosity_min": 500, "viscosity_max": 45_000, "categories": ["Foundation", "Mascara", "Lip Gloss"], "complexity_capability": 3, "capacity_kg": 700, "automation": "Medium", "baseline_oee": 75.0, "reliability": .89},
    {"line_id": "C05", "line_name": "Flexible Vessel 05", "stage": "Compounding", "viscosity_min": 100, "viscosity_max": 70_000, "categories": ["Skincare", "Lotion", "Cream", "Serum", "Foundation"], "complexity_capability": 3, "capacity_kg": 1500, "automation": "Low", "baseline_oee": 72.0, "reliability": .87},
]

CATEGORIES = ["Skincare", "Foundation", "Mascara", "Lip Gloss", "Lotion", "Cream", "Serum"]
FORMULAS = ["Lotion", "Serum", "Emulsion", "Gel", "Cream", "Liquid Foundation", "Mascara", "Gloss"]
PRODUCT_NAMES = ["Hydra Balance", "Velvet Radiance", "Aqua Repair", "Luminous Silk", "Barrier Cloud", "Precision Wear", "Calm Restore", "Dew Finish", "Lift Define", "Gloss Veil", "Soft Focus", "Daily Defense"]


def stable_unit(*parts: object) -> float:
    digest = hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()
    return int(digest[:12], 16) / float(16**12 - 1)


def _weighted_choice(rng: random.Random, items: list[Any]) -> Any:
    return items[rng.randrange(len(items))]


def _make_launches() -> list[dict[str, Any]]:
    rng = random.Random(SEED)
    launches: list[dict[str, Any]] = []
    start = date(2023, 1, 2)
    for idx in range(1260):
        line = _weighted_choice(rng, FILLING_LINES)
        category = _weighted_choice(rng, line["category_experience"])
        tech = _weighted_choice(rng, line["technologies"])
        package = _weighted_choice(rng, line["packages"])
        container = _weighted_choice(rng, line["containers"])
        closure = _weighted_choice(rng, line["closures"])
        decoration = _weighted_choice(rng, line["decorations"])
        low, high = line["viscosity_min"], line["viscosity_max"]
        viscosity = round(low + (high - low) * rng.betavariate(2.2, 2.2))
        fill = round(line["fill_min"] + (line["fill_max"] - line["fill_min"]) * rng.betavariate(2, 2))
        complexity = _weighted_choice(rng, ["Low", "Medium", "High"])
        formula = {"Serum": "Serum", "Cream": "Cream", "Lotion": "Lotion", "Mascara": "Mascara", "Lip Gloss": "Gloss", "Foundation": "Liquid Foundation"}.get(category, _weighted_choice(rng, FORMULAS))
        centrality = 1 - abs(viscosity - ((low + high) / 2)) / max(1, (high - low) / 2)
        sequence = rng.randint(1, 4)
        startup_penalty = 7.5 / math.sqrt(sequence)
        noise = (stable_unit(idx, line["line_id"]) - .5) * 5
        oee = max(54, min(91, line["baseline_oee"] - startup_penalty + centrality * 4 - (complexity == "High") * 2 + noise))
        scrap = max(.8, line["baseline_scrap"] + startup_penalty * .16 + (1-centrality)*1.2 + (stable_unit("s", idx)-.5)*1.1)
        throughput = int(line["design_speed"] * 60 * oee / 100 * (0.94 + stable_unit("t", idx)*.1))
        changeover = int(35 + (complexity == "High")*16 + (decoration != "None")*10 + stable_unit("c", idx)*55)
        outcome = "Strong" if oee >= 78 and scrap < 3.5 else "Stable" if oee >= 69 and scrap < 5 else "Challenged"
        launches.append({
            "launch_id": f"L-{idx+1:04d}", "sku": f"SKU-{1000 + idx % 420:04d}",
            "product_name": f"{_weighted_choice(rng, PRODUCT_NAMES)} {idx % 37 + 1}",
            "category": category, "product_family": _weighted_choice(rng, ["Hydration", "Color", "Treatment", "Daily Care", "Premium"]),
            "formula_type": formula, "viscosity": viscosity, "fill_volume_ml": fill,
            "package_type": package, "container_type": container, "closure_type": closure,
            "filling_technology": tech, "decoration": decoration, "process_complexity": complexity,
            "line_id": line["line_id"], "line_name": line["line_name"], "run_sequence": sequence,
            "launch_date": str(start + timedelta(days=rng.randint(0, 1094))),
            "startup_oee": round(oee, 1), "startup_scrap": round(scrap, 1),
            "throughput": throughput, "line_speed": round(throughput / 60, 1),
            "labor": line["baseline_labor"] + int(complexity == "High"),
            "changeover_minutes": changeover, "startup_outcome": outcome,
        })
    return launches


LAUNCH_RECORDS = _make_launches()


def dataset_summary() -> dict[str, Any]:
    return {
        "skus": 420, "formulas": 130, "filling_lines": len(FILLING_LINES),
        "compounding_lines": len(COMPOUNDING_LINES), "production_runs": 22_708,
        "launch_records": len(LAUNCH_RECORDS), "historical_period": "Jan 2023 – Dec 2025",
        "downtime_events": 3_842, "changeover_pairs": 256,
    }

