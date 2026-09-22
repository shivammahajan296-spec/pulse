from __future__ import annotations

from typing import Any


COMPLEXITY = {"Low": 1, "Medium": 2, "High": 3}


def evaluate_filling(product: dict[str, Any], lines: list[dict[str, Any]]) -> tuple[list[dict], list[dict]]:
    eligible, excluded = [], []
    for line in lines:
        reasons = []
        v = product["viscosity"]
        if v < line["viscosity_min"] or v > line["viscosity_max"]:
            bound = line["viscosity_min"] if v < line["viscosity_min"] else line["viscosity_max"]
            direction = "below minimum" if v < line["viscosity_min"] else "exceeds operating limit"
            reasons.append(f"Viscosity {v:,.0f} cP {direction} of {bound:,.0f} cP.")
        if product["fill_volume_ml"] < line["fill_min"] or product["fill_volume_ml"] > line["fill_max"]:
            reasons.append(f"Fill volume {product['fill_volume_ml']:,.0f} ml is outside the {line['fill_min']}–{line['fill_max']} ml capability.")
        checks = [
            ("filling_technology", "technologies", "filling technology"),
            ("package_type", "packages", "package format"),
            ("container_type", "containers", "container type"),
            ("closure_type", "closures", "closure"),
            ("decoration", "decorations", "decoration capability"),
        ]
        for field, capability, label in checks:
            if product[field] not in line[capability]:
                reasons.append(f"{product[field]} {label} is not supported.")
        if COMPLEXITY[product["process_complexity"]] > line["complexity_capability"]:
            reasons.append(f"{product['process_complexity']} process complexity exceeds line capability.")
        if reasons:
            excluded.append({"line_id": line["line_id"], "line_name": line["line_name"], "reason": reasons[0], "all_reasons": reasons})
        else:
            eligible.append(line)
    return eligible, excluded


def evaluate_compounding(product: dict[str, Any], lines: list[dict[str, Any]]) -> tuple[list[dict], list[dict]]:
    if not product.get("compounding_required"):
        return [], []
    eligible, excluded = [], []
    for line in lines:
        reasons = []
        if not line["viscosity_min"] <= product["viscosity"] <= line["viscosity_max"]:
            reasons.append(f"Viscosity is outside the {line['viscosity_min']:,}–{line['viscosity_max']:,} cP vessel envelope.")
        if product["category"] not in line["categories"]:
            reasons.append(f"{product['category']} processing is not qualified on this vessel.")
        if COMPLEXITY[product["process_complexity"]] > line["complexity_capability"]:
            reasons.append("Process complexity exceeds validated mixing capability.")
        item = {"line_id": line["line_id"], "line_name": line["line_name"], "stage": "Compounding"}
        if reasons:
            excluded.append({**item, "reason": reasons[0], "all_reasons": reasons})
        else:
            fit = 1 - abs(product["viscosity"] - (line["viscosity_min"] + line["viscosity_max"]) / 2) / ((line["viscosity_max"] - line["viscosity_min"]) / 2)
            score = line["baseline_oee"] * .55 + line["reliability"] * 25 + max(0, fit) * 20
            eligible.append({**item, "score": round(score, 1), "capacity_kg": line["capacity_kg"], "automation": line["automation"]})
    eligible.sort(key=lambda x: x["score"], reverse=True)
    for index, item in enumerate(eligible, 1):
        item["rank"] = index
    return eligible, excluded

