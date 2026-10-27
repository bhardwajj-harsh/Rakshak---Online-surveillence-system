"""Unit tests for Multi-Factor Explainable Risk Engine & Audit Report Service."""

import pytest
from fastapi.testclient import TestClient

from app.core.types import AnomalyScore, CrowdState, Detection, Severity, TrackedPerson
from app.main import app
from app.services.audit import audit_service
from app.services.pipeline import pipeline
from app.services.risk import RiskEngine

client = TestClient(app)


def test_multifactor_risk_formula_baseline():
    """Verify baseline risk calculation under normal conditions."""
    engine = RiskEngine()
    crowd = CrowdState(
        total_people=100,
        density_score=20.0,
        average_speed=15.0,
        movement_variance=12.0,
        congestion_score=10.0,
        zone_densities={"Platform 1": 20.0, "Gate 1": 10.0},
    )
    anomaly = AnomalyScore(overall=10.0)
    risk = engine.assess(crowd, anomaly, [], [], [], fire_active=False)

    assert risk.overall_score < 25.0
    assert risk.severity == Severity.LOW
    assert risk.confidence >= 0.85
    assert "density_anomaly" in risk.factors
    assert "kinetic_panic" in risk.factors
    assert "bottleneck_congestion" in risk.factors
    assert "hazard_proximity" in risk.factors
    assert risk.dominant_cause == "Normal Baseline Operating Parameters"


def test_hazard_proximity_decay_formulation():
    """Verify exponential proximity decay calculation when fire is active at Gate 2."""
    engine = RiskEngine()
    crowd = CrowdState(
        total_people=200,
        density_score=75.0,
        average_speed=40.0,
        movement_variance=55.0,
        congestion_score=80.0,
        zone_densities={"Gate 2": 85.0, "Gate 4": 15.0},
    )
    anomaly = AnomalyScore(overall=70.0, fire_probability=95.0)
    detections = [Detection(detection_type="FIRE", confidence=95.0, location="Gate 2")]

    # Create agents converging on Gate 2 (center: 75, 37.5)
    people = [
        TrackedPerson(track_id=i, x=75.0 + (i % 5), y=37.5 + (i % 5))
        for i in range(50)
    ]

    risk = engine.assess(
        crowd,
        anomaly,
        detections,
        [],
        people=people,
        fire_active=True,
        fire_location="Gate 2",
        intervention_active=False,
    )

    assert risk.overall_score > 60.0
    assert risk.severity in (Severity.HIGH, Severity.CRITICAL)
    assert risk.factors["hazard_proximity"] > 50.0
    assert "Gate 2" in risk.dominant_cause
    assert risk.projected_risk_10s > 0


def test_intervention_reduces_multifactor_risk():
    """Verify that intervention scales down overall score and updates contributing factors."""
    engine = RiskEngine()
    crowd = CrowdState(
        total_people=200,
        density_score=80.0,
        average_speed=35.0,
        movement_variance=60.0,
        congestion_score=85.0,
        zone_densities={"Gate 2": 90.0},
    )
    anomaly = AnomalyScore(overall=75.0, fire_probability=90.0)

    risk_unmitigated = engine.assess(
        crowd, anomaly, [], [], fire_active=True, fire_location="Gate 2", intervention_active=False
    )
    risk_mitigated = engine.assess(
        crowd, anomaly, [], [], fire_active=True, fire_location="Gate 2", intervention_active=True
    )

    assert risk_mitigated.overall_score < risk_unmitigated.overall_score
    assert any("intervention" in f.lower() for f in risk_mitigated.contributing_factors)


def test_audit_report_generation_and_endpoints():
    """Verify audit report JSON and Markdown endpoints."""
    # 1. Test POST /api/reports/generate
    res_gen = client.post("/api/reports/generate")
    assert res_gen.status_code == 200
    report = res_gen.json()
    assert "report_id" in report
    assert "executive_summary" in report
    assert "telemetry_metrics" in report
    assert "explainable_ai_breakdown" in report
    assert "factors" in report["explainable_ai_breakdown"]
    assert "dominant_cause" in report["explainable_ai_breakdown"]

    # 2. Test GET /api/reports/latest
    res_latest = client.get("/api/reports/latest")
    assert res_latest.status_code == 200
    assert res_latest.json()["report_id"] == report["report_id"]

    # 3. Test GET /api/reports/markdown
    res_md = client.get("/api/reports/markdown")
    assert res_md.status_code == 200
    assert "RAKSHAK Emergency Intelligence" in res_md.text
    assert "Explainable AI (XAI)" in res_md.text
