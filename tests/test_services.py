import unittest

from app.data.synthetic_data import FILLING_LINES, LAUNCH_RECORDS, dataset_summary
from app.data.module2_data import module2_plan, solve_module2
from app.models import SKUAnalysisRequest
from app.services.analysis_service import analyze
from app.services.eligibility import evaluate_filling
from app.services.similarity import SIMILARITY_WEIGHTS


def demo_payload() -> dict:
    return SKUAnalysisRequest(
        product_name="New Hydrating Lotion", category="Skincare", product_family="Hydration",
        formula_type="Lotion", viscosity=14500, fill_volume_ml=200, package_type="Bottle",
        container_type="Plastic Bottle", closure_type="Pump", filling_technology="Piston Filling",
        decoration="Label", process_complexity="Medium", compounding_required=True,
        previous_product="Hydrating Serum", previous_product_category="Skincare",
        planned_batch_quantity=50000, run_sequence=1, campaign_position=2,
        days_since_prior_run=4, days_since_last_pm=11, labor_assumption=6,
    ).model_dump()


def medium_risk_payload() -> dict:
    return SKUAnalysisRequest(
        product_name="Radiance Renewal Serum", category="Serum", product_family="Treatment",
        formula_type="Serum", viscosity=11500, fill_volume_ml=100, package_type="Bottle",
        container_type="Glass Bottle", closure_type="Dropper", filling_technology="Pump Filling",
        decoration="Hot Stamp", process_complexity="High", compounding_required=True,
        previous_product="Daily Foundation", previous_product_category="Foundation",
        planned_batch_quantity=30000, run_sequence=1, campaign_position=1,
        days_since_prior_run=21, days_since_last_pm=30, labor_assumption=7,
    ).model_dump()


def high_risk_payload() -> dict:
    return SKUAnalysisRequest(
        product_name="Extreme Volume Mascara", category="Mascara", product_family="Color",
        formula_type="Mascara", viscosity=60000, fill_volume_ml=15, package_type="Bottle",
        container_type="Plastic Bottle", closure_type="Wand", filling_technology="Mascara Filling",
        decoration="Hot Stamp", process_complexity="High", compounding_required=True,
        previous_product="Hydrating Lotion", previous_product_category="Skincare",
        planned_batch_quantity=65000, run_sequence=1, campaign_position=1,
        days_since_prior_run=45, days_since_last_pm=60, labor_assumption=6,
    ).model_dump()


def cold_start_payload() -> dict:
    return SKUAnalysisRequest(
        launch_scenario="cold_start", product_name="Bio-Peptide Microgel", category="Skincare",
        product_family="Premium", formula_type="Gel", viscosity=26000, fill_volume_ml=75,
        package_type="Airless Pump", container_type="Plastic Bottle", closure_type="Pump",
        filling_technology="Piston Filling", decoration="Sleeve", process_complexity="High",
        compounding_required=True, previous_product="Hydrating Serum",
        previous_product_category="Serum", planned_batch_quantity=18000, run_sequence=1,
        campaign_position=1, days_since_prior_run=30, days_since_last_pm=60,
        labor_assumption=6,
    ).model_dump()


def rebrand_payload() -> dict:
    return SKUAnalysisRequest(
        launch_scenario="rebrand", product_name="Aurelia Hydration Lotion", category="Skincare",
        product_family="Daily Care", formula_type="Lotion", viscosity=14500, fill_volume_ml=200,
        package_type="Bottle", container_type="Plastic Bottle", closure_type="Pump",
        filling_technology="Piston Filling", decoration="Label", process_complexity="Medium",
        compounding_required=True, previous_product="Aqua Repair Lotion",
        previous_product_category="Skincare", planned_batch_quantity=50000, run_sequence=1,
        campaign_position=2, days_since_prior_run=3, days_since_last_pm=11,
        labor_assumption=6,
    ).model_dump()


class AnalysisTests(unittest.TestCase):
    def test_data_scale_and_weights(self):
        self.assertEqual(dataset_summary()["production_runs"], 22708)
        self.assertEqual(len(FILLING_LINES), 12)
        self.assertGreaterEqual(len(LAUNCH_RECORDS), 1000)
        self.assertAlmostEqual(sum(SIMILARITY_WEIGHTS.values()), 1.0)

    def test_demo_analysis_is_complete(self):
        result = analyze(demo_payload())
        self.assertGreaterEqual(len(result["ranked_lines"]), 3)
        self.assertEqual(result["recommended_line"]["line_id"], "F04")
        best = result["ranked_lines"][0]
        self.assertEqual(len(best["similar_launches"]), 5)
        self.assertLess(best["predictions"]["oee_interval"][0], best["predictions"]["oee"])
        self.assertGreater(best["predictions"]["oee_interval"][1], best["predictions"]["oee"])
        self.assertTrue(best["risk_flags"])
        self.assertTrue(result["compounding_candidates"])
        self.assertTrue(result["what_would_change"])

    def test_analysis_is_deterministic(self):
        first, second = analyze(demo_payload()), analyze(demo_payload())
        values = lambda r: [(x["line_id"], x["score"], x["predictions"]) for x in r["ranked_lines"]]
        self.assertEqual(values(first), values(second))

    def test_eligibility_has_exact_reasons(self):
        product = demo_payload() | {"viscosity": 99000, "fill_volume_ml": 1200}
        eligible, excluded = evaluate_filling(product, FILLING_LINES)
        self.assertFalse(eligible)
        self.assertEqual(len(excluded), 12)
        self.assertTrue(all(item["reason"] and item["all_reasons"] for item in excluded))

    def test_storyline_examples_cover_three_risk_levels(self):
        expected = [(demo_payload(), "Low"), (medium_risk_payload(), "Medium"), (high_risk_payload(), "High")]
        for payload, severity in expected:
            result = analyze(payload)
            self.assertTrue(result["ranked_lines"])
            self.assertEqual(result["ranked_lines"][0]["risk_flags"][0]["severity"], severity)

    def test_cold_start_uses_no_product_analogues(self):
        result = analyze(cold_start_payload())
        best = result["ranked_lines"][0]
        self.assertEqual(best["similar_launches"], [])
        self.assertEqual(best["predictions"]["reference_count"], 0)
        self.assertEqual(best["predictions"]["uncertainty_level"], "High")
        self.assertEqual(best["risk_flags"][0]["severity"], "High")

    def test_rebrand_uses_technical_history(self):
        result = analyze(rebrand_payload())
        best = result["ranked_lines"][0]
        self.assertEqual(len(best["similar_launches"]), 5)
        self.assertEqual(best["predictions"]["reference_count"], 5)
        self.assertGreater(best["similar_launches"][0]["similarity_score"], 70)
        self.assertEqual(best["risk_flags"][0]["severity"], "Low")

    def test_module2_synthetic_plan_is_complete(self):
        plan = module2_plan()
        self.assertEqual(len(plan["skus"]), 7)
        self.assertEqual(len(plan["lines"]), 6)
        self.assertEqual(len(plan["constraints"]), 12)
        self.assertIn("recommended", plan["sequences"])
        self.assertLess(plan["metrics"]["recommended_cost"], plan["metrics"]["current_cost"])

    def test_module2_scenario_recalculates_dependent_metrics(self):
        baseline = solve_module2({"scenario_name": "Baseline", "moq_adjustment": 0, "active_constraints": 5})
        higher_moq = solve_module2({"scenario_name": "Higher MOQ", "moq_adjustment": 25, "active_constraints": 5})
        self.assertLess(higher_moq["metrics"]["recommended_cost"], baseline["metrics"]["recommended_cost"])
        self.assertLess(higher_moq["metrics"]["changeovers_recommended"], baseline["metrics"]["changeovers_recommended"])
        self.assertGreater(higher_moq["metrics"]["inventory_recommended"], baseline["metrics"]["inventory_recommended"])


if __name__ == "__main__":
    unittest.main()
