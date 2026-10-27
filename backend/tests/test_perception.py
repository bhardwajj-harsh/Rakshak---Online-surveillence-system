"""Unit & integration tests for Multi-Camera Perception Engine and Video API."""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ml.perception import MultiCameraPerceptionEngine, perception_engine
from app.services.pipeline import pipeline

client = TestClient(app)


def test_multicamera_engine_dual_frame_generation():
    """Verify multi-camera frame generation, bounding boxes, and track extraction for Cam 0 & 1."""
    engine = MultiCameraPerceptionEngine()

    # Test Camera 0 (Platform 1)
    frame0, people0, det0 = engine.process_camera_frame(camera_id=0)
    assert isinstance(frame0, np.ndarray)
    assert frame0.shape == (360, 640, 3)
    assert len(people0) > 0
    assert len(det0) > 0
    for p in people0:
        assert 0.0 <= p.x <= 100.0
        assert 0.0 <= p.y <= 100.0
        assert p.track_id >= 100

    # Test Camera 1 (Gate 1 Concourse)
    frame1, people1, det1 = engine.process_camera_frame(camera_id=1)
    assert isinstance(frame1, np.ndarray)
    assert frame1.shape == (360, 640, 3)
    assert len(people1) > 0
    assert len(det1) > 0
    for p in people1:
        assert 0.0 <= p.x <= 100.0
        assert 0.0 <= p.y <= 100.0
        assert p.track_id >= 200


def test_multicamera_spatial_fusion():
    """Verify multi-camera spatial track fusion merges observations from all cameras."""
    engine = MultiCameraPerceptionEngine()
    fused_people, fused_detections = engine.get_fused_state()

    assert len(fused_people) >= 14
    assert len(fused_detections) >= 14

    # Ensure tracks from both cameras are present
    cam0_tracks = [p for p in fused_people if 100 <= p.track_id < 200]
    cam1_tracks = [p for p in fused_people if p.track_id >= 200]
    assert len(cam0_tracks) > 0
    assert len(cam1_tracks) > 0


def test_multicamera_metrics():
    """Verify perception engine metrics for multi-camera streams."""
    metrics = perception_engine.get_metrics()
    assert "model" in metrics
    assert "cameras_count" in metrics
    assert metrics["cameras_count"] >= 2
    assert "camera_0" in metrics
    assert "camera_1" in metrics


def test_video_status_endpoint():
    """Verify GET /api/video/status returns multi-camera telemetry."""
    res = client.get("/api/video/status")
    assert res.status_code == 200
    data = res.json()
    assert "model" in data
    assert "camera_0" in data
    assert "camera_1" in data
    assert "current_pipeline_source" in data


def test_video_mode_switch_and_fused_pipeline():
    """Verify POST /api/video/mode switches to REAL_PERCEPTION and ingests fused multi-camera tracks."""
    res_real = client.post("/api/video/mode", json={"data_source": "REAL_PERCEPTION"})
    assert res_real.status_code == 200
    assert res_real.json()["data_source"] == "REAL_PERCEPTION"
    assert pipeline.data_source == "REAL_PERCEPTION"

    # Process tick under multi-camera REAL_PERCEPTION
    pipeline._process_tick()
    assert pipeline.state.data_source == "REAL_PERCEPTION"
    assert len(pipeline.state.people) >= 14

    # Verify both Cam 0 and Cam 1 tracks exist in LiveState
    track_ids = [p.track_id for p in pipeline.state.people]
    assert any(100 <= tid < 200 for tid in track_ids)
    assert any(tid >= 200 for tid in track_ids)

    # Switch back to SIMULATION
    res_sim = client.post("/api/video/mode", json={"data_source": "SIMULATION"})
    assert res_sim.status_code == 200
    assert res_sim.json()["data_source"] == "SIMULATION"
    assert pipeline.data_source == "SIMULATION"
