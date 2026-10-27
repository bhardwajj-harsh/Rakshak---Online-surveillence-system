"""WebSocket connection, serialization, mutation, and lifecycle tests."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_websocket_connect_and_receive_standardized_schema():
    """Verify WebSocket connection and schema conformity."""
    with client.websocket_connect("/ws/live") as websocket:
        msg = websocket.receive_json()
        assert msg["type"] == "LIVE_STATE"
        assert msg["version"] == 1
        assert "timestamp" in msg
        assert "data" in msg

        data = msg["data"]
        # Required LiveState schema fields
        assert "tick" in data
        assert "scenario" in data
        assert "running" in data
        assert "data_source" in data
        assert data["data_source"] in ("SIMULATION", "REAL_PERCEPTION", "HYBRID")
        assert "people" in data
        assert isinstance(data["people"], list)
        assert "detections" in data
        assert isinstance(data["detections"], list)
        assert "crowd" in data
        assert "anomaly" in data
        assert "risk" in data
        assert "predictions" in data
        assert "incidents" in data
        assert "response" in data
        assert "risk_history" in data
        assert "fire_active" in data
        assert "fire_location" in data
        assert "intervention_active" in data


def test_websocket_scenario_mutation_fire():
    """Test mutation via REST API to FIRE at Gate 2 and verify WebSocket reflection."""
    with client.websocket_connect("/ws/live") as websocket:
        # Initial message on connect
        _ = websocket.receive_json()

        # Start FIRE scenario at Gate 2
        start_res = client.post(
            "/api/simulation/start",
            json={
                "scenario": "FIRE",
                "intensity": 80.0,
                "crowd_size": 200,
                "incident_location": "Gate 2",
            },
        )
        assert start_res.status_code == 200
        assert start_res.json()["status"] == "started"

        # Receive streamed state
        msg = websocket.receive_json()
        assert msg["type"] == "LIVE_STATE"
        data = msg["data"]
        assert data["scenario"] == "FIRE"
        assert data["fire_location"] == "Gate 2"
        assert data["fire_active"] is True
        assert data["running"] is True

        # Stop simulation
        stop_res = client.post("/api/simulation/stop")
        assert stop_res.status_code == 200

        # Receive stopped state (draining any in-flight tick)
        stop_msg = websocket.receive_json()
        if stop_msg.get("data", {}).get("running") is True:
            stop_msg = websocket.receive_json()
        assert stop_msg["data"]["running"] is False

        # Reset simulation
        reset_res = client.post("/api/simulation/reset")
        assert reset_res.status_code == 200


def test_websocket_graceful_disconnect():
    """Test that client disconnection cleanly removes connection without server error."""
    ws = client.websocket_connect("/ws/live")
    websocket = ws.__enter__()
    init_msg = websocket.receive_json()
    assert init_msg["type"] == "LIVE_STATE"

    # Close connection gracefully
    ws.__exit__(None, None, None)

    # Trigger a broadcast and verify backend functions normally
    res = client.post(
        "/api/simulation/start",
        json={"scenario": "NORMAL", "intensity": 50, "crowd_size": 100, "incident_location": "Gate 1"},
    )
    assert res.status_code == 200
    client.post("/api/simulation/stop")
    client.post("/api/simulation/reset")


def test_websocket_ping_pong():
    """Test heartbeat ping-pong."""
    with client.websocket_connect("/ws/live") as websocket:
        _ = websocket.receive_json()  # Initial state
        websocket.send_text("ping")
        resp = websocket.receive_json()
        assert resp.get("type") == "PONG"
