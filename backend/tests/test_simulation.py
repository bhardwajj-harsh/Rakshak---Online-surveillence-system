"""End-to-end multi-scenario simulation & intelligence tests."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.pipeline import pipeline

client = TestClient(app)


def test_multi_hazard_scenario_lifecycle():
    # 1. Start MULTI_HAZARD scenario
    res = client.post(
        "/api/simulation/start",
        json={
            "scenario": "MULTI_HAZARD",
            "intensity": 85.0,
            "crowd_size": 200,
            "incident_location": "Gate 2",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "started"

    # 2. Connect WebSocket to receive live broadcast
    with client.websocket_connect("/ws/live") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "LIVE_STATE"
        state = msg["data"]
        assert state["running"] is True
        assert state["scenario"] == "MULTI_HAZARD"
        assert len(state["people"]) > 0

    # 3. Check risk and predictions via API
    res_risk = client.get("/api/risk/current")
    assert res_risk.status_code == 200
    risk_data = res_risk.json()
    assert risk_data["overall_score"] >= 0

    # 4. Trigger RAKSHAK intervention (redirect crowd)
    res_int = client.post("/api/simulation/intervention", json={"active": True})
    assert res_int.status_code == 200
    assert res_int.json()["intervention_active"] is True

    # 5. Stop simulation
    res_stop = client.post("/api/simulation/stop")
    assert res_stop.status_code == 200

    # 6. Reset simulation
    res_reset = client.post("/api/simulation/reset")
    assert res_reset.status_code == 200
    assert res_reset.json()["status"] == "reset"


def test_restricted_intrusion_scenario():
    res = client.post(
        "/api/simulation/start",
        json={
            "scenario": "RESTRICTED_INTRUSION",
            "intensity": 60.0,
            "crowd_size": 100,
            "incident_location": "Service Area",
        },
    )
    assert res.status_code == 200

    with client.websocket_connect("/ws/live") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "LIVE_STATE"
        assert msg["data"]["scenario"] == "RESTRICTED_INTRUSION"

    client.post("/api/simulation/stop")
    client.post("/api/simulation/reset")
