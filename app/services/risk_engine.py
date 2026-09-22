from __future__ import annotations

from typing import Any


def evaluate_risks(product: dict[str, Any], line: dict[str, Any], p: dict[str, Any]) -> list[dict[str, str]]:
    risks: list[dict[str, str]] = []
    def add(name: str, severity: str, driver: str, evidence: str, explanation: str, mitigation: str) -> None:
        risks.append({"name": name, "severity": severity, "driver": driver, "evidence": evidence, "explanation": explanation, "mitigation": mitigation})
    if p["scrap_pct"] >= 4:
        add("Elevated Scrap", "High" if p["scrap_pct"] >= 5 else "Medium", "Startup fit and material handling", f"Predicted scrap {p['scrap_pct']}% vs comparable median {p['comparable_median_scrap']}%.", "Comparable startup runs indicate above-target material loss.", "Use a reduced-speed startup profile and approve first-off quality checks.")
    if p["uncertainty_level"] != "Low":
        add("Startup Uncertainty", p["uncertainty_level"], "Limited or variable comparable evidence", f"OEE interval spans {p['oee_interval'][0]}%–{p['oee_interval'][1]}% across {p['reference_count']} strong references.", "The likely performance range is wider than preferred for launch planning.", "Add an engineering trial or reserve contingency capacity.")
    if p["viscosity_centrality"] < 35:
        edge = "upper" if product["viscosity"] > (line["viscosity_min"]+line["viscosity_max"])/2 else "lower"
        add("Viscosity Near Boundary", "Medium", f"Viscosity near {edge} operating boundary", f"Viscosity centrality is {p['viscosity_centrality']}% within the qualified envelope.", "Operation close to a capability boundary increases startup sensitivity.", "Confirm pump/nozzle setup and stage material conditioning.")
    if p["changeover_minutes"] >= 85:
        add("Long Changeover", "Medium", "Previous-to-new product transition", f"Estimated changeover is {p['changeover_minutes']} minutes.", "Cleaning and format changes extend the pre-launch window.", "Pre-stage tooling and sequence after a compatible product family.")
    if p["labor_required"] > product["labor_assumption"]:
        add("Labor Constraint", "High", "Line staffing requirement", f"Requires {p['labor_required']} operators; assumption allows {product['labor_assumption']}.", "The expected startup crew exceeds the stated operating assumption.", "Approve temporary launch support or select a more automated line.")
    if p["overfill_risk"] >= .2:
        add("Overfill Risk", "Medium", "Fill-control variability", f"Estimated overfill probability is {p['overfill_risk']*100:.0f}%.", "Startup variability may increase giveaway until controls stabilize.", "Increase weight-check frequency during the first startup hour.")
    if not risks:
        add("No Material Startup Risk", "Low", "Strong fit and evidence", f"Compatibility {p['compatibility']}% with {p['reference_count']} strong references.", "No modeled risk crossed a material threshold.", "Follow standard launch controls and hourly quality checks.")
    order = {"High": 0, "Medium": 1, "Low": 2}
    return sorted(risks, key=lambda r: order[r["severity"]])

