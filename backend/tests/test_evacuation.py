"""Unit & integration tests for dynamic evacuation routing and pathfinding."""

import pytest
from fastapi.testclient import TestClient

from app.core.types import CrowdState
from app.main import app
from app.services.evacuation import EvacuationEngine, evacuation_engine
from app.services.pipeline import pipeline

client = TestClient(app)


def test_evacuation_graph_normal_pathfinding():
    """Verify normal shortest-path evacuation from Platform 1."""
    engine = EvacuationEngine()
    crowd = CrowdState(zone_densities={"Gate 1": 10.0, "Gate 2": 15.0, "Gate 3": 10.0, "Gate 4": 10.0})
    routes, safe_exits = engine.compute_evacuation_routes(crowd, fire_active=False)

    assert len(safe_exits) == 4
    p1_route = next(r for r in routes if r.from_zone == "Platform 1")
    assert p1_route.status == "CLEAR"
    assert p1_route.path[0] == "Platform 1"
    assert p1_route.recommended_exit in ("Gate 1", "Gate 2", "Gate 3", "Gate 4")


def test_evacuation_recalculation_when_gate_2_blocked_by_fire():
    """When Gate 2 is on fire, verify path avoidance and dynamic routing to Gate 1, 3, or 4."""
    engine = EvacuationEngine()
    crowd = CrowdState(zone_densities={"Gate 1": 20.0, "Gate 2": 95.0, "Gate 3": 25.0, "Gate 4": 15.0})

    routes, safe_exits = engine.compute_evacuation_routes(
        crowd, fire_active=True, fire_location="Gate 2"
    )

    # Gate 2 must not be in safe_exits
    assert "Gate 2" not in safe_exits
    assert len(safe_exits) >= 3

    # Main Corridor & Platform 1 routes must route to safe alternative exits
    corridor_route = next(r for r in routes if r.from_zone == "Main Corridor")
    assert corridor_route.recommended_exit in ("Gate 1", "Gate 3", "Gate 4")
    assert corridor_route.recommended_exit != "Gate 2"

    p1_route = next(r for r in routes if r.from_zone == "Platform 1")
    assert p1_route.recommended_exit in ("Gate 1", "Gate 3", "Gate 4")
    assert "Gate 2" not in p1_route.path

    gate2_route = next(r for r in routes if r.from_zone == "Gate 2")
    assert gate2_route.status == "BLOCKED"


def test_evacuation_routes_api_endpoint():
    """Verify GET /api/evacuation/routes returns valid graph state."""
    res = client.get("/api/evacuation/routes")
    assert res.status_code == 200
    data = res.json()
    assert "routes" in data
    assert len(data["routes"]) > 0
    assert "safe_exits" in data
    assert "graph_nodes" in data
    assert "Platform 1" in data["graph_nodes"]
    assert "Gate 4" in data["safe_exits"]


def test_intervention_reduces_risk_score():
    """Verify that intervention_active causes agents to evacuate and reduces overall risk."""
    # 1. Start MULTI_HAZARD simulation
    pipeline.reset_simulation()
    pipeline.start_simulation(
        scenario="MULTI_HAZARD",
        intensity=85.0,
        crowd_size=200,
        incident_location="Gate 2",
    )

    # Process 5 ticks under normal hazard progression
    for _ in range(5):
        pipeline._process_tick()

    pre_risk = pipeline.state.risk.overall_score
    assert pre_risk > 0

    # 2. Activate RAKSHAK evacuation intervention
    pipeline.apply_intervention(active=True)

    # Process ticks with intervention active
    for _ in range(8):
        pipeline._process_tick()

    post_risk = pipeline.state.risk.overall_score
    assert post_risk < pre_risk
    assert pipeline.state.intervention_active is True

    # 3. Clean up
    pipeline.stop_simulation()
    pipeline.reset_simulation()
