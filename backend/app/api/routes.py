"""API route handlers."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.schemas import (
    HealthResponse,
    PredictionResponse,
    RiskAssessmentResponse,
    SystemStatusResponse,
)
from app.services.pipeline import pipeline

router = APIRouter()


class SimulationStartRequest(BaseModel):
    scenario: str = Field(default="NORMAL", description="Scenario type")
    intensity: float = Field(default=50.0, ge=0, le=100)
    crowd_size: int = Field(default=300, ge=50, le=5000)
    incident_location: str = Field(default="Gate 2")


class InterventionRequest(BaseModel):
    active: bool = True


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", service="RAKSHAK")


@router.get("/system/status", response_model=SystemStatusResponse)
async def system_status():
    state = pipeline.get_state()
    return SystemStatusResponse(
        ai_engine="ONLINE",
        video_engine="ONLINE" if state.get("running") else "STANDBY",
        risk_engine="ONLINE",
        simulation="RUNNING" if state.get("running") else "READY",
        demo_mode=True,
    )


@router.get("/risk/current", response_model=RiskAssessmentResponse)
async def current_risk():
    state = pipeline.get_state()
    risk = state.get("risk", {})
    if not risk:
        raise HTTPException(status_code=404, detail="No risk data available")
    from datetime import datetime
    return RiskAssessmentResponse(
        overall_score=risk.get("overall_score", 0),
        severity=risk.get("severity", "LOW"),
        contributing_factors=risk.get("contributing_factors", []),
        confidence=risk.get("confidence", 0),
        factors=risk.get("factors", {}),
        dominant_cause=risk.get("dominant_cause", "Normal Operating Baseline"),
        projected_risk_10s=risk.get("projected_risk_10s", 0),
        timestamp=datetime.fromisoformat(risk["timestamp"]) if risk.get("timestamp") else datetime.utcnow(),
    )


@router.get("/predictions/current")
async def current_predictions():
    state = pipeline.get_state()
    return {"predictions": state.get("predictions", []), "data_source": "SIMULATION"}


@router.get("/simulation/status")
async def simulation_status():
    return pipeline.get_state()


@router.post("/simulation/start")
async def start_simulation(request: SimulationStartRequest):
    valid_scenarios = {"NORMAL", "FIRE", "CROWD_SURGE", "RESTRICTED_INTRUSION", "MULTI_HAZARD"}
    if request.scenario not in valid_scenarios:
        raise HTTPException(status_code=400, detail=f"Invalid scenario. Must be one of: {valid_scenarios}")
    pipeline.start_simulation(
        scenario=request.scenario,
        intensity=request.intensity,
        crowd_size=request.crowd_size,
        incident_location=request.incident_location,
    )
    pipeline._process_tick()
    await pipeline._notify()
    return {"status": "started", "scenario": request.scenario, "data_source": "SIMULATION"}


@router.post("/simulation/stop")
async def stop_simulation():
    pipeline.stop_simulation()
    await pipeline._notify()
    return {"status": "stopped"}


@router.post("/simulation/reset")
async def reset_simulation():
    pipeline.reset_simulation()
    await pipeline._notify()
    return {"status": "reset", "data_source": "SIMULATION"}


@router.post("/simulation/intervention")
async def apply_intervention(request: InterventionRequest):
    pipeline.apply_intervention(request.active)
    await pipeline._notify()
    return {"intervention_active": request.active, "data_source": "SIMULATION"}


@router.get("/analytics")
async def analytics():
    state = pipeline.get_state()
    return {
        "risk_history": state.get("risk_history", []),
        "crowd": state.get("crowd", {}),
        "anomaly": state.get("anomaly", {}),
        "incidents": state.get("incidents", []),
        "data_source": "SIMULATION",
    }


@router.get("/evacuation/routes")
async def evacuation_routes():
    """Returns dynamic station graph topology and real-time evacuation routing solutions."""
    state = pipeline.state
    data = pipeline.evacuation_engine.get_inspection_data(
        state.crowd,
        fire_active=state.fire_active,
        fire_location=state.fire_location,
    )
    return data


@router.get("/reports/latest")
async def get_latest_report():
    """Get the most recently generated or real-time post-incident audit report."""
    from app.services.audit import audit_service
    report = audit_service.get_latest_report(pipeline.state)
    return report


@router.post("/reports/generate")
async def generate_audit_report():
    """Trigger generation of a comprehensive post-incident audit report."""
    from app.services.audit import audit_service
    report = audit_service.generate_report(pipeline.state)
    return report


@router.get("/reports/markdown")
async def get_report_markdown():
    """Export the post-incident audit report in formatted Markdown."""
    from fastapi.responses import PlainTextResponse
    from app.services.audit import audit_service
    report = audit_service.get_latest_report(pipeline.state)
    md = audit_service.generate_markdown(report)
    return PlainTextResponse(content=md, media_type="text/markdown")
