"""Pydantic request/response schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str


class IncidentResponse(BaseModel):
    id: int
    incident_type: str
    severity: str
    confidence: float
    location: str
    timestamp: datetime
    status: str
    detected_factors: Optional[str] = None
    recommended_actions: Optional[str] = None

    model_config = {"from_attributes": True}


class RiskAssessmentResponse(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    severity: str
    contributing_factors: List[str] = []
    confidence: float = Field(ge=0, le=100)
    factors: dict = {}
    dominant_cause: Optional[str] = None
    projected_risk_10s: Optional[float] = None
    timestamp: datetime


class PredictionResponse(BaseModel):
    event_type: str
    probability: float = Field(ge=0, le=100)
    estimated_time_to_threshold: Optional[float] = None
    affected_zone: Optional[str] = None
    explanation: Optional[str] = None


class EvacuationRouteSchema(BaseModel):
    from_zone: str
    to_zone: str
    status: str
    recommended_exit: str
    path: List[str] = []
    distance: float = 0.0
    estimated_time_seconds: float = 0.0


class EvacuationInspectionResponse(BaseModel):
    routes: List[EvacuationRouteSchema]
    safe_exits: List[str]
    hazard_zones: List[str]
    graph_nodes: List[str]
    data_source: str = "SIMULATION"


class SystemStatusResponse(BaseModel):
    ai_engine: str = "ONLINE"
    video_engine: str = "ONLINE"
    risk_engine: str = "ONLINE"
    simulation: str = "READY"
    demo_mode: bool = True
