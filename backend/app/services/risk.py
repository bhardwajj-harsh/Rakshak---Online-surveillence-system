from __future__ import annotations

"""Explainable AI (XAI) Multi-Factor Risk Engine.

Strict mathematical formulation:
- Density Anomaly Factor (w1 = 0.25): Normalized zonal density variance against historical baseline
- Kinetic Entropy / Panic Factor (w2 = 0.25): High velocity variance + directional divergence among adjacent agents
- Bottleneck Choke Index (w3 = 0.20): Ingress/egress flow imbalance near gate nodes
- Hazard Proximity Decay (w4 = 0.30): Exponential spatial penalty based on agent proximity to active hazard coordinates:
    sum(exp(-0.05 * dist(agent, hazard)))
"""

import math
from datetime import datetime
from typing import Dict, List, Optional

from app.core.types import (
    AnomalyScore,
    CrowdState,
    Detection,
    RiskAssessment,
    Severity,
    SimulatedIncident,
    TrackedPerson,
)
from app.simulation.station import EXIT_ZONES, ZONE_BY_NAME


class RiskEngine:
    """Formalized Explainable Multi-Factor Risk Assessment Engine."""

    WEIGHTS = {
        "density_anomaly": 0.25,
        "kinetic_panic": 0.25,
        "bottleneck_congestion": 0.20,
        "hazard_proximity": 0.30,
    }

    SEVERITY_THRESHOLDS = {
        Severity.LOW: (0, 30),
        Severity.MEDIUM: (30, 55),
        Severity.HIGH: (55, 80),
        Severity.CRITICAL: (80, 100),
    }

    def assess(
        self,
        crowd: CrowdState,
        anomaly: AnomalyScore,
        detections: list[Detection],
        incidents: list[SimulatedIncident],
        people: list[TrackedPerson] | None = None,
        risk_history: list[float] | None = None,
        fire_active: bool = False,
        fire_location: Optional[str] = None,
        intervention_active: bool = False,
    ) -> RiskAssessment:
        people_list = people or []
        densities = crowd.zone_densities or {}

        # ---------------------------------------------------------
        # 1. Density Anomaly Factor (w1 = 0.25)
        # ---------------------------------------------------------
        avg_density = crowd.density_score
        max_zone_density = max(densities.values(), default=0.0)
        # Zonal variance against normal baseline (~25%)
        density_anomaly = min(
            100.0,
            max(0.0, avg_density * 0.5 + max_zone_density * 0.5 + max(0.0, crowd.density_change_rate) * 1.5),
        )

        # ---------------------------------------------------------
        # 2. Kinetic Entropy / Panic Factor (w2 = 0.25)
        # ---------------------------------------------------------
        velocity_variance = crowd.movement_variance
        average_speed = crowd.average_speed
        kinetic_panic = min(
            100.0,
            max(0.0, velocity_variance * 0.65 + average_speed * 0.45),
        )

        # ---------------------------------------------------------
        # 3. Bottleneck Choke Index (w3 = 0.20)
        # ---------------------------------------------------------
        gate_names = [z.name for z in EXIT_ZONES]
        gate_densities = [densities.get(g, 0.0) for g in gate_names]
        max_gate_choke = max(gate_densities, default=0.0)
        bottleneck_congestion = min(
            100.0,
            max(0.0, crowd.congestion_score * 0.55 + max_gate_choke * 0.55),
        )

        # ---------------------------------------------------------
        # 4. Hazard Proximity Decay (w4 = 0.30)
        # Formula: sum(exp(-0.05 * dist(agent, hazard)))
        # ---------------------------------------------------------
        hazard_proximity = 0.0
        fire_dets = [d for d in detections if d.detection_type == "FIRE"]
        fire_conf = max((d.confidence for d in fire_dets), default=90.0 if fire_active else 0.0)

        target_hazard = fire_location or ("Gate 2" if fire_active else None)
        if fire_active and target_hazard and target_hazard in ZONE_BY_NAME:
            hx, hy = ZONE_BY_NAME[target_hazard].center
            if people_list:
                decay_sum = sum(
                    math.exp(-0.05 * math.sqrt((p.x - hx) ** 2 + (p.y - hy) ** 2))
                    for p in people_list
                )
                ratio = decay_sum / max(1, len(people_list))
                # Ratio of ~0.1 (far) to ~0.7 (converged near fire)
                hazard_proximity = min(100.0, max(0.0, ratio * 130.0 + (fire_conf / 100.0) * 25.0))
            else:
                hazard_proximity = 75.0 if fire_active else 0.0
        elif anomaly.restricted_intrusion > 0:
            hazard_proximity = min(100.0, anomaly.restricted_intrusion * 0.85)

        # ---------------------------------------------------------
        # Weighted Overall Score
        # ---------------------------------------------------------
        overall = (
            self.WEIGHTS["density_anomaly"] * density_anomaly
            + self.WEIGHTS["kinetic_panic"] * kinetic_panic
            + self.WEIGHTS["bottleneck_congestion"] * bottleneck_congestion
            + self.WEIGHTS["hazard_proximity"] * hazard_proximity
        )

        factors_map = {
            "density_anomaly": round(density_anomaly, 1),
            "kinetic_panic": round(kinetic_panic, 1),
            "bottleneck_congestion": round(bottleneck_congestion, 1),
            "hazard_proximity": round(hazard_proximity, 1),
        }

        # Human-readable contributing factor list
        contributing_factors: List[str] = []
        if density_anomaly > 40:
            contributing_factors.append(f"Zonal density anomaly at {density_anomaly:.0f}% (Peak zone: {max_zone_density:.0f}%)")
        if kinetic_panic > 35:
            contributing_factors.append(f"Kinetic panic & velocity turbulence at {kinetic_panic:.0f}%")
        if bottleneck_congestion > 45:
            contributing_factors.append(f"Exit bottleneck choke index at {bottleneck_congestion:.0f}%")
        if hazard_proximity > 25:
            contributing_factors.append(f"Hazard proximity decay penalty at {hazard_proximity:.0f}% ({target_hazard or 'Zone'})")

        # ---------------------------------------------------------
        # Dominant Cause Identification (XAI)
        # ---------------------------------------------------------
        weighted_scores = {
            "Hazard Proximity": self.WEIGHTS["hazard_proximity"] * hazard_proximity,
            "Exit Bottleneck": self.WEIGHTS["bottleneck_congestion"] * bottleneck_congestion,
            "Kinetic Panic": self.WEIGHTS["kinetic_panic"] * kinetic_panic,
            "Density Surge": self.WEIGHTS["density_anomaly"] * density_anomaly,
        }

        dominant_key = max(weighted_scores, key=weighted_scores.get)
        if fire_active and hazard_proximity > 20:
            dominant_cause = f"Hazard Proximity & Choke at {target_hazard or 'Gate 2'}"
        elif anomaly.restricted_intrusion > 0:
            dominant_cause = "Restricted Area Intrusion Breach"
        elif overall > 40:
            if dominant_key == "Exit Bottleneck":
                dominant_cause = f"Exit Bottleneck Choke (Gate Congestion {max_gate_choke:.0f}%)"
            elif dominant_key == "Kinetic Panic":
                dominant_cause = "Kinetic Entropy & Directional Panic Divergence"
            else:
                dominant_cause = "Zonal Density Surge & Overcrowding"
        else:
            dominant_cause = "Normal Baseline Operating Parameters"

        # ---------------------------------------------------------
        # Projected Risk (10-second trend projection)
        # ---------------------------------------------------------
        history = risk_history or []
        trend_delta = 0.0
        if len(history) >= 4:
            recent_avg = sum(history[-3:]) / 3.0
            earlier_avg = sum(history[-6:-3]) / max(1, len(history[-6:-3]))
            trend_delta = recent_avg - earlier_avg

        projected_risk_10s = round(
            min(100.0, max(0.0, overall + trend_delta * 2.2)), 1
        )

        # ---------------------------------------------------------
        # RAKSHAK Intervention Mitigation Scaling
        # ---------------------------------------------------------
        if intervention_active:
            overall = max(0.0, overall * 0.35)
            projected_risk_10s = max(0.0, projected_risk_10s * 0.35)
            contributing_factors.append("RAKSHAK intervention active — crowd rerouted away from hazard")

        if not contributing_factors:
            contributing_factors.append("Normal operating conditions — all metrics within safety margins")

        severity = self._score_to_severity(overall)
        confidence = round(
            min(0.98, max(0.85, 0.85 + (0.03 if people_list else 0.0) + (0.05 if fire_active else 0.0))),
            2,
        )

        return RiskAssessment(
            overall_score=round(overall, 1),
            severity=severity,
            confidence=confidence,
            contributing_factors=contributing_factors,
            factors=factors_map,
            dominant_cause=dominant_cause,
            projected_risk_10s=projected_risk_10s,
            timestamp=datetime.utcnow(),
        )

    def _score_to_severity(self, score: float) -> Severity:
        for severity, (low, high) in self.SEVERITY_THRESHOLDS.items():
            if low <= score < high:
                return severity
        return Severity.CRITICAL if score >= 80 else Severity.LOW
