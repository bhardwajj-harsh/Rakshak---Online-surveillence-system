from __future__ import annotations

"""Rule-based response recommendation engine."""

from app.core.types import (
    EvacuationRoute,
    PredictionResult,
    ResponseAction,
    ResponsePlan,
    RiskAssessment,
    Severity,
    SimulatedIncident,
)


class ResponseEngine:
    """Generates actionable response recommendations with reasons.

    Decision support only — requires human approval for critical actions.
    """

    def recommend(
        self,
        risk: RiskAssessment,
        predictions: list[PredictionResult],
        incidents: list[SimulatedIncident],
        intervention_active: bool = False,
        evacuation_routes: list[EvacuationRoute] | None = None,
        safe_exits: list[str] | None = None,
    ) -> ResponsePlan:
        actions: list[ResponseAction] = []
        incident_type = "GENERAL"
        severity = risk.severity

        fire_incidents = [i for i in incidents if i.incident_type == "FIRE"]
        crowd_incidents = [i for i in incidents if i.incident_type == "CROWD_ANOMALY"]
        intrusion_incidents = [i for i in incidents if i.incident_type == "RESTRICTED_INTRUSION"]

        if fire_incidents:
            incident_type = "FIRE"
            actions.extend(self._fire_response(fire_incidents[0], predictions, intervention_active))
        elif crowd_incidents:
            incident_type = "CROWD_ANOMALY"
            actions.extend(self._crowd_response(crowd_incidents[0], predictions))
        elif intrusion_incidents:
            incident_type = "RESTRICTED_INTRUSION"
            actions.extend(self._intrusion_response(intrusion_incidents[0]))
        elif risk.overall_score > 50:
            incident_type = "ELEVATED_RISK"
            actions.extend(self._general_response(risk, predictions))

        if not actions and risk.overall_score > 20:
            actions.append(
                ResponseAction(
                    action="Increase monitoring frequency",
                    reason=f"Risk score at {risk.overall_score:.0f} — above baseline",
                    priority=3,
                )
            )

        if not actions:
            actions.append(
                ResponseAction(
                    action="Continue normal monitoring",
                    reason="All metrics within normal operating parameters",
                    priority=5,
                )
            )

        actions.sort(key=lambda a: a.priority)
        requires_approval = severity in (Severity.HIGH, Severity.CRITICAL)

        return ResponsePlan(
            incident_type=incident_type,
            severity=severity,
            actions=actions,
            requires_human_approval=requires_approval,
            evacuation_routes=evacuation_routes or [],
            safe_exits=safe_exits or [],
        )

    def _fire_response(
        self,
        incident: SimulatedIncident,
        predictions: list[PredictionResult],
        intervention_active: bool,
    ) -> list[ResponseAction]:
        actions = [
            ResponseAction(
                action="Alert emergency response team",
                reason=f"Fire detected at {incident.location} with {incident.confidence:.0f}% confidence (simulation)",
                priority=1,
            ),
            ResponseAction(
                action=f"Restrict affected zone — {incident.location}",
                reason="Prevent crowd from entering hazardous area",
                priority=1,
            ),
        ]

        convergence = [p for p in predictions if p.event_type == "CROWD_CONVERGENCE"]
        if convergence:
            pred = convergence[0]
            if intervention_active:
                actions.append(
                    ResponseAction(
                        action="Intervention active — crowd redirected to Gate 4",
                        reason="RAKSHAK simulation estimate: risk reduced via crowd redirection",
                        priority=2,
                    )
                )
            else:
                actions.append(
                    ResponseAction(
                        action="Redirect crowd to Gate 4",
                        reason=(
                            f"{pred.affected_zone} predicted to reach critical congestion "
                            f"in ~{pred.estimated_time_to_threshold or '?'} min (simulation estimate)"
                        ),
                        priority=1,
                    )
                )

        actions.append(
            ResponseAction(
                action="Open alternative evacuation route via Gate 4",
                reason="Gate 2 affected — Gate 4 has lower congestion (simulation estimate)",
                priority=2,
            )
        )
        actions.append(
            ResponseAction(
                action="Notify medical unit",
                reason="Fire incident may require medical response",
                priority=2,
            )
        )
        actions.append(
            ResponseAction(
                action="Broadcast emergency message",
                reason="Inform public of evacuation routes away from affected area",
                priority=3,
            )
        )
        return actions

    def _crowd_response(
        self,
        incident: SimulatedIncident,
        predictions: list[PredictionResult],
    ) -> list[ResponseAction]:
        actions = [
            ResponseAction(
                action=f"Deploy crowd control at {incident.location}",
                reason=f"Crowd anomaly detected — {incident.confidence:.0f}% confidence (simulation)",
                priority=1,
            ),
        ]
        congestion_preds = [p for p in predictions if p.event_type == "EXIT_CONGESTION"]
        if congestion_preds:
            pred = congestion_preds[0]
            actions.append(
                ResponseAction(
                    action=f"Open additional exit capacity at Gate 4",
                    reason=(
                        f"{pred.affected_zone} congestion predicted in "
                        f"~{pred.estimated_time_to_threshold or '?'} min (simulation estimate)"
                    ),
                    priority=1,
                )
            )
        return actions

    def _intrusion_response(self, incident: SimulatedIncident) -> list[ResponseAction]:
        return [
            ResponseAction(
                action="Alert security personnel",
                reason=f"Restricted zone intrusion at {incident.location} (simulation)",
                priority=1,
            ),
            ResponseAction(
                action="Lock down service area access points",
                reason="Prevent further unauthorized entry",
                priority=1,
            ),
        ]

    def _general_response(
        self,
        risk: RiskAssessment,
        predictions: list[PredictionResult],
    ) -> list[ResponseAction]:
        actions = []
        for factor in risk.contributing_factors[:3]:
            actions.append(
                ResponseAction(
                    action=f"Investigate: {factor}",
                    reason="Elevated risk factor detected (simulation-derived)",
                    priority=2,
                )
            )
        return actions
