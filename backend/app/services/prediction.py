from __future__ import annotations

"""Short-term escalation prediction — trend-based projection, NOT long-range ML."""

from app.core.types import CrowdState, PredictionResult, RiskAssessment


class PredictionEngine:
    """Projects short-term trends based on current crowd and risk metrics.

    All outputs are labeled as 'Short-term trend projection (simulation-derived)'.
    This is NOT predictive AI — it extrapolates current rate-of-change.
    """

    CONGESTION_THRESHOLD = 80.0
    RISK_THRESHOLD = 70.0

    def predict(
        self,
        crowd: CrowdState,
        risk: RiskAssessment,
        risk_history: list[float],
        fire_active: bool = False,
        fire_location: str | None = None,
    ) -> list[PredictionResult]:
        predictions: list[PredictionResult] = []

        # Congestion prediction
        if crowd.congestion_score > 40:
            time_to_congestion = self._estimate_time_to_threshold(
                crowd.congestion_score,
                crowd.density_change_rate * 0.5,  # congestion follows density
                self.CONGESTION_THRESHOLD,
            )
            affected = self._most_congested_zone(crowd)
            raw_prob = crowd.congestion_score + max(-30.0, crowd.density_change_rate)
            predictions.append(
                PredictionResult(
                    event_type="EXIT_CONGESTION",
                    probability=round(min(100.0, max(5.0, raw_prob)), 1),
                    estimated_time_to_threshold=time_to_congestion,
                    affected_zone=affected,
                    explanation=(
                        f"{affected} congestion at {crowd.congestion_score:.0f}%, "
                        f"trend {'+' if crowd.density_change_rate >= 0 else ''}"
                        f"{crowd.density_change_rate:.1f} pts/min"
                    ),
                )
            )

        # Risk escalation prediction
        if risk.overall_score > 30:
            risk_trend = self._compute_trend(risk_history)
            time_to_critical = self._estimate_time_to_threshold(
                risk.overall_score,
                risk_trend,
                self.RISK_THRESHOLD,
            )
            raw_risk_prob = risk.overall_score + risk_trend * 2
            predictions.append(
                PredictionResult(
                    event_type="INCIDENT_ESCALATION",
                    probability=round(min(100.0, max(5.0, raw_risk_prob)), 1),
                    estimated_time_to_threshold=time_to_critical,
                    affected_zone=fire_location or "Station-wide",
                    explanation=(
                        f"Risk score {risk.overall_score:.0f} trending "
                        f"{'+' if risk_trend >= 0 else ''}{risk_trend:.1f} pts/tick"
                    ),
                )
            )

        # Fire spread / crowd convergence prediction
        if fire_active and fire_location:
            gate_density = crowd.zone_densities.get(fire_location, 0)
            if gate_density > 30:
                time_to_critical = self._estimate_time_to_threshold(
                    gate_density,
                    crowd.density_change_rate,
                    90.0,
                )
                predictions.append(
                    PredictionResult(
                        event_type="CROWD_CONVERGENCE",
                        probability=round(min(100.0, max(10.0, gate_density + 10)), 1),
                        estimated_time_to_threshold=time_to_critical,
                        affected_zone=fire_location,
                        explanation=(
                            f"Crowd converging on {fire_location} — "
                            f"density {gate_density:.0f}% and rising"
                        ),
                    )
                )

        return predictions

    def _estimate_time_to_threshold(
        self,
        current: float,
        rate_per_minute: float,
        threshold: float,
    ) -> float | None:
        if rate_per_minute <= 0.1:
            return None
        remaining = threshold - current
        if remaining <= 0:
            return 0.0
        return round(remaining / rate_per_minute, 1)

    def _compute_trend(self, history: list[float]) -> float:
        if len(history) < 2:
            return 0.0
        recent = history[-5:] if len(history) >= 5 else history
        return (recent[-1] - recent[0]) / max(len(recent) - 1, 1)

    def _most_congested_zone(self, crowd: CrowdState) -> str:
        if not crowd.zone_densities:
            return "Unknown"
        return max(crowd.zone_densities, key=crowd.zone_densities.get)  # type: ignore
