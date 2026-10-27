from __future__ import annotations

"""Pipeline orchestrator — connects simulation through response."""

import asyncio
import json
from datetime import datetime
from typing import Callable, List, Optional

from app.core.types import LiveState, ScenarioType
from app.ml.perception import perception_engine
from app.services.anomaly import AnomalyScorer
from app.services.crowd import CrowdIntelligence
from app.services.evacuation import evacuation_engine
from app.services.prediction import PredictionEngine
from app.services.response import ResponseEngine
from app.services.risk import RiskEngine
from app.simulation.engine import SimulationEngine


class IntelligencePipeline:
    """Orchestrates: INPUT → DETECTION → CROWD → ANOMALY → RISK → PREDICTION → RESPONSE."""

    MAX_HISTORY = 60

    def __init__(self):
        self.simulation = SimulationEngine()
        self.crowd_intel = CrowdIntelligence()
        self.anomaly_scorer = AnomalyScorer()
        self.risk_engine = RiskEngine()
        self.prediction_engine = PredictionEngine()
        self.response_engine = ResponseEngine()
        self.evacuation_engine = evacuation_engine
        self.perception_engine = perception_engine
        self.data_source = "SIMULATION"
        self.state = LiveState()
        self._task: Optional[asyncio.Task] = None
        self._subscribers: List[Callable] = []
        self._risk_history: List[float] = []

    def set_data_source(self, data_source: str):
        self.data_source = data_source
        self.state.data_source = data_source

    def subscribe(self, callback: Callable):
        self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable):
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    async def _notify(self):
        payload = self.get_message_payload()
        for cb in list(self._subscribers):
            try:
                if asyncio.iscoroutinefunction(cb):
                    await cb(payload)
                else:
                    cb(payload)
            except Exception:
                pass

    def get_message_payload(self) -> dict:
        state_data = self._serialize_state()
        return {
            "type": "LIVE_STATE",
            "version": 1,
            "timestamp": state_data.get("timestamp"),
            "data": state_data,
        }

    def _serialize_state(self) -> dict:
        s = self.state
        return {
            "tick": s.tick,
            "timestamp": s.timestamp.isoformat(),
            "scenario": s.scenario,
            "running": s.running,
            "data_source": s.data_source,
            "people": [
                {
                    "track_id": p.track_id,
                    "x": round(p.x, 1),
                    "y": round(p.y, 1),
                    "vx": round(p.vx, 2),
                    "vy": round(p.vy, 2),
                    "speed": round(p.speed, 2),
                    "direction": round(p.direction, 2),
                    "in_restricted_zone": p.in_restricted_zone,
                }
                for p in s.people
            ],
            "detections": [
                {
                    "detection_type": d.detection_type,
                    "confidence": d.confidence,
                    "location": d.location,
                    "source": d.source,
                }
                for d in s.detections
            ],
            "crowd": {
                "total_people": s.crowd.total_people,
                "density_score": s.crowd.density_score,
                "average_speed": s.crowd.average_speed,
                "movement_variance": s.crowd.movement_variance,
                "dominant_direction": s.crowd.dominant_direction,
                "density_change_rate": s.crowd.density_change_rate,
                "congestion_score": s.crowd.congestion_score,
                "zone_densities": s.crowd.zone_densities,
            },
            "anomaly": {
                "overall": s.anomaly.overall,
                "crowd_anomaly": s.anomaly.crowd_anomaly,
                "movement_anomaly": s.anomaly.movement_anomaly,
                "density_change": s.anomaly.density_change,
                "fire_probability": s.anomaly.fire_probability,
                "restricted_intrusion": s.anomaly.restricted_intrusion,
            },
            "risk": {
                "overall_score": s.risk.overall_score,
                "severity": s.risk.severity.value,
                "confidence": s.risk.confidence,
                "factors": s.risk.factors,
                "dominant_cause": s.risk.dominant_cause,
                "projected_risk_10s": s.risk.projected_risk_10s,
                "contributing_factors": s.risk.contributing_factors,
                "timestamp": s.risk.timestamp.isoformat(),
            },
            "predictions": [
                {
                    "event_type": p.event_type,
                    "probability": p.probability,
                    "estimated_time_to_threshold": p.estimated_time_to_threshold,
                    "affected_zone": p.affected_zone,
                    "explanation": p.explanation,
                    "label": p.label,
                }
                for p in s.predictions
            ],
            "incidents": [
                {
                    "incident_type": i.incident_type,
                    "severity": i.severity.value,
                    "confidence": i.confidence,
                    "location": i.location,
                    "status": i.status,
                    "detected_factors": i.detected_factors,
                }
                for i in s.incidents
            ],
            "response": {
                "incident_type": s.response.incident_type,
                "severity": s.response.severity.value,
                "requires_human_approval": s.response.requires_human_approval,
                "actions": [
                    {"action": a.action, "reason": a.reason, "priority": a.priority}
                    for a in s.response.actions
                ],
                "evacuation_routes": [
                    {
                        "from_zone": r.from_zone,
                        "to_zone": r.to_zone,
                        "status": r.status,
                        "recommended_exit": r.recommended_exit,
                        "path": r.path,
                        "distance": r.distance,
                        "estimated_time_seconds": r.estimated_time_seconds,
                    }
                    for r in s.response.evacuation_routes
                ],
                "safe_exits": s.response.safe_exits,
            } if s.response else None,
            "risk_history": s.risk_history,
            "fire_active": s.fire_active,
            "fire_location": s.fire_location,
            "intervention_active": s.intervention_active,
        }

    def start_simulation(
        self,
        scenario: str = "NORMAL",
        intensity: float = 50.0,
        crowd_size: int = 300,
        incident_location: str = "Gate 2",
    ):
        scenario_enum = ScenarioType(scenario)
        self.simulation.configure(scenario_enum, intensity, crowd_size, incident_location)
        self.simulation.start()
        self.crowd_intel.reset()
        self.state = LiveState(
            scenario=scenario,
            running=True,
            data_source=self.data_source,
            fire_location=self.simulation.fire_location if scenario in ("FIRE", "MULTI_HAZARD") else None,
            fire_active=self.simulation.fire_active,
        )
        try:
            loop = asyncio.get_running_loop()
            if self._task is None or self._task.done():
                self._task = loop.create_task(self._run_loop())
        except RuntimeError:
            self._task = None

    def stop_simulation(self):
        self.simulation.stop()
        self.state.running = False

    def reset_simulation(self):
        self.stop_simulation()
        self.simulation = SimulationEngine()
        self.crowd_intel.reset()
        self._risk_history = []
        self.state = LiveState(data_source=self.data_source)
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None

    def apply_intervention(self, active: bool = True):
        self.simulation.apply_intervention(active)
        self.state.intervention_active = active

    async def _run_loop(self):
        dt = 1.0 / SimulationEngine.TICK_RATE
        while self.simulation.running:
            self._process_tick()
            await self._notify()
            await asyncio.sleep(dt)
        await self._notify()

    def _process_tick(self):
        if self.data_source == "REAL_PERCEPTION":
            people, detections = self.perception_engine.get_fused_state()
            new_incidents = []
        else:
            detections, new_incidents = self.simulation.tick_update(
                dt=1.0 / SimulationEngine.TICK_RATE
            )
            people = list(self.simulation.people)

        crowd = self.crowd_intel.compute(
            people,
            self.simulation.elapsed,
        )
        anomaly = self.anomaly_scorer.compute(crowd, detections)
        risk = self.risk_engine.assess(
            crowd,
            anomaly,
            detections,
            new_incidents,
            people=people,
            risk_history=self._risk_history,
            fire_active=self.simulation.fire_active,
            fire_location=self.simulation.fire_location,
            intervention_active=self.simulation.intervention_active,
        )
        predictions = self.prediction_engine.predict(
            crowd,
            risk,
            self._risk_history,
            fire_active=self.simulation.fire_active,
            fire_location=self.simulation.fire_location,
        )
        routes, safe_exits = self.evacuation_engine.compute_evacuation_routes(
            crowd,
            fire_active=self.simulation.fire_active,
            fire_location=self.simulation.fire_location,
        )
        response = self.response_engine.recommend(
            risk,
            predictions,
            new_incidents,
            intervention_active=self.simulation.intervention_active,
            evacuation_routes=routes,
            safe_exits=safe_exits,
        )

        self._risk_history.append(risk.overall_score)
        if len(self._risk_history) > self.MAX_HISTORY:
            self._risk_history = self._risk_history[-self.MAX_HISTORY:]

        # Merge incidents (keep recent unique)
        existing_types = {i.incident_type for i in self.state.incidents}
        for inc in new_incidents:
            if inc.incident_type not in existing_types or inc.confidence > 80:
                self.state.incidents = [
                    i for i in self.state.incidents if i.incident_type != inc.incident_type
                ] + [inc]

        self.state.tick = self.simulation.tick
        self.state.timestamp = datetime.utcnow()
        self.state.data_source = self.data_source
        self.state.people = people
        self.state.detections = detections
        self.state.crowd = crowd
        self.state.anomaly = anomaly
        self.state.risk = risk
        self.state.predictions = predictions
        self.state.response = response
        self.state.risk_history = list(self._risk_history)
        self.state.fire_active = self.simulation.fire_active
        self.state.fire_location = self.simulation.fire_location
        self.state.intervention_active = self.simulation.intervention_active
        self.state.running = self.simulation.running

    def get_state(self) -> dict:
        return self._serialize_state()


# Singleton pipeline instance
pipeline = IntelligencePipeline()
