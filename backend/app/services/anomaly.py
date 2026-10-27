from __future__ import annotations

"""Anomaly scoring — weighted multi-signal detection."""

from app.core.config import get_settings
from app.core.types import AnomalyScore, CrowdState, Detection

# Configurable weights with documented rationale:
# - crowd_anomaly: Unusual crowd density patterns (25%)
# - movement_anomaly: Erratic or sudden movement changes (20%)
# - density_change: Rapid density increases indicate surge (15%)
# - fire_probability: Direct hazard signal (25%)
# - restricted_intrusion: Security breach signal (15%)
DEFAULT_WEIGHTS = {
    "crowd_anomaly": 0.25,
    "movement_anomaly": 0.20,
    "density_change": 0.15,
    "fire_probability": 0.25,
    "restricted_intrusion": 0.15,
}


class AnomalyScorer:
    """Computes weighted anomaly score from multiple signals."""

    def __init__(self, weights: dict | None = None):
        self.weights = weights or DEFAULT_WEIGHTS

    def compute(
        self,
        crowd: CrowdState,
        detections: list[Detection],
        baseline_density: float = 30.0,
        baseline_speed: float = 20.0,
    ) -> AnomalyScore:
        # Crowd anomaly: deviation from baseline density
        crowd_anomaly = min(100.0, max(0.0, crowd.density_score - baseline_density))
        if crowd.density_score > baseline_density:
            crowd_anomaly = min(100.0, ((crowd.density_score - baseline_density) / (100 - baseline_density)) * 100)

        # Movement anomaly: high speed + high variance = panic
        movement_anomaly = min(100.0, (crowd.average_speed * 0.5 + crowd.movement_variance * 0.5))

        # Density change: sudden increases
        density_change = min(100.0, max(0.0, abs(crowd.density_change_rate) * 2))

        # Fire probability from detections
        fire_dets = [d for d in detections if d.detection_type == "FIRE"]
        fire_probability = max((d.confidence for d in fire_dets), default=0.0)

        # Restricted intrusion
        intrusion_dets = [d for d in detections if d.detection_type == "RESTRICTED_ZONE_INTRUSION"]
        restricted_intrusion = max((d.confidence for d in intrusion_dets), default=0.0)

        # Weighted overall score
        overall = (
            crowd_anomaly * self.weights["crowd_anomaly"]
            + movement_anomaly * self.weights["movement_anomaly"]
            + density_change * self.weights["density_change"]
            + fire_probability * self.weights["fire_probability"]
            + restricted_intrusion * self.weights["restricted_intrusion"]
        )

        return AnomalyScore(
            overall=round(min(100.0, overall), 1),
            crowd_anomaly=round(crowd_anomaly, 1),
            movement_anomaly=round(movement_anomaly, 1),
            density_change=round(density_change, 1),
            fire_probability=round(fire_probability, 1),
            restricted_intrusion=round(restricted_intrusion, 1),
            weights=self.weights,
        )
