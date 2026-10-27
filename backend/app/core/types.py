from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional


class ScenarioType(str, Enum):
    NORMAL = "NORMAL"
    FIRE = "FIRE"
    CROWD_SURGE = "CROWD_SURGE"
    RESTRICTED_INTRUSION = "RESTRICTED_INTRUSION"
    MULTI_HAZARD = "MULTI_HAZARD"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DataSource(str, Enum):
    SIMULATION = "SIMULATION"
    REAL_PERCEPTION = "REAL_PERCEPTION"
    HYBRID = "HYBRID"


@dataclass
class Zone:
    name: str
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    is_exit: bool = False
    is_restricted: bool = False
    capacity: int = 200

    @property
    def center(self) -> tuple[float, float]:
        return ((self.x_min + self.x_max) / 2, (self.y_min + self.y_max) / 2)

    @property
    def area(self) -> float:
        return max((self.x_max - self.x_min) * (self.y_max - self.y_min), 1.0)

    def contains(self, x: float, y: float) -> bool:
        return self.x_min <= x <= self.x_max and self.y_min <= y <= self.y_max


@dataclass
class TrackedPerson:
    """Simulated tracked person — anonymous ID, no PII."""

    track_id: int
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    first_seen: float = 0.0
    last_seen: float = 0.0
    is_stationary: bool = False
    in_restricted_zone: bool = False

    @property
    def speed(self) -> float:
        return (self.vx**2 + self.vy**2) ** 0.5

    @property
    def direction(self) -> float:
        import math
        if self.speed < 0.01:
            return 0.0
        return math.atan2(self.vy, self.vx)


@dataclass
class Detection:
    """Detection event from simulation (not real ML)."""

    detection_type: str
    confidence: float
    location: str
    track_id: Optional[int] = None
    bbox: Optional[List[float]] = None
    source: str = "SIMULATION"


@dataclass
class CrowdState:
    total_people: int = 0
    density_score: float = 0.0
    average_speed: float = 0.0
    movement_variance: float = 0.0
    dominant_direction: float = 0.0
    density_change_rate: float = 0.0
    congestion_score: float = 0.0
    zone_densities: Dict[str, float] = field(default_factory=dict)


@dataclass
class AnomalyScore:
    overall: float = 0.0
    crowd_anomaly: float = 0.0
    movement_anomaly: float = 0.0
    density_change: float = 0.0
    fire_probability: float = 0.0
    restricted_intrusion: float = 0.0
    weights: Dict[str, float] = field(default_factory=dict)


@dataclass
class RiskAssessment:
    overall_score: float = 0.0
    severity: Severity = Severity.LOW
    confidence: float = 0.0
    contributing_factors: List[str] = field(default_factory=list)
    factors: Dict[str, float] = field(default_factory=dict)
    dominant_cause: str = "Normal Operating Baseline"
    projected_risk_10s: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class PredictionResult:
    event_type: str
    probability: float
    estimated_time_to_threshold: Optional[float] = None
    affected_zone: Optional[str] = None
    explanation: str = ""
    label: str = "Short-term trend projection (simulation-derived)"


@dataclass
class ResponseAction:
    action: str
    reason: str
    priority: int = 1


@dataclass
class EvacuationRoute:
    from_zone: str
    to_zone: str
    status: str
    recommended_exit: str
    path: List[str] = field(default_factory=list)
    distance: float = 0.0
    estimated_time_seconds: float = 0.0


@dataclass
class ResponsePlan:
    incident_type: str
    severity: Severity
    actions: List[ResponseAction] = field(default_factory=list)
    requires_human_approval: bool = True
    evacuation_routes: List[EvacuationRoute] = field(default_factory=list)
    safe_exits: List[str] = field(default_factory=list)


@dataclass
class SimulatedIncident:
    incident_type: str
    severity: Severity
    confidence: float
    location: str
    status: str = "DETECTED"
    detected_factors: List[str] = field(default_factory=list)


@dataclass
class LiveState:
    """Complete pipeline state broadcast via WebSocket."""

    tick: int = 0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    scenario: str = "NORMAL"
    running: bool = False
    data_source: str = "SIMULATION"
    people: List[TrackedPerson] = field(default_factory=list)
    detections: List[Detection] = field(default_factory=list)
    crowd: CrowdState = field(default_factory=CrowdState)
    anomaly: AnomalyScore = field(default_factory=AnomalyScore)
    risk: RiskAssessment = field(default_factory=RiskAssessment)
    predictions: List[PredictionResult] = field(default_factory=list)
    incidents: List[SimulatedIncident] = field(default_factory=list)
    response: Optional[ResponsePlan] = None
    risk_history: List[float] = field(default_factory=list)
    fire_active: bool = False
    fire_location: Optional[str] = None
    intervention_active: bool = False
