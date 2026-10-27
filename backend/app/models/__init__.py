"""SQLAlchemy database models."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class User(Base):
    """System user (admin/operator)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="operator")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Incident(Base):
    """Emergency incident record."""

    __tablename__ = "incidents"
    __table_args__ = (
        Index("ix_incidents_timestamp", "timestamp"),
        Index("ix_incidents_type", "incident_type"),
        Index("ix_incidents_severity", "severity"),
        Index("ix_incidents_status", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    location: Mapped[str] = mapped_column(String(200), default="unknown")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(50), default="DETECTED")
    detected_factors: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_actions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Detection(Base):
    """Computer vision detection record."""

    __tablename__ = "detections"
    __table_args__ = (Index("ix_detections_timestamp", "timestamp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    detection_type: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    bbox: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    track_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RiskAssessmentRecord(Base):
    """Persisted risk assessment snapshot."""

    __tablename__ = "risk_assessments"
    __table_args__ = (Index("ix_risk_assessments_timestamp", "timestamp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    severity: Mapped[str] = mapped_column(String(50), default="LOW")
    contributing_factors: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PredictionRecord(Base):
    """Persisted prediction snapshot."""

    __tablename__ = "predictions"
    __table_args__ = (Index("ix_predictions_timestamp", "timestamp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    probability: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_time_to_threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    affected_zone: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ResponseAction(Base):
    """Recommended or executed response action."""

    __tablename__ = "response_actions"
    __table_args__ = (Index("ix_response_actions_timestamp", "timestamp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="RECOMMENDED")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SimulationRun(Base):
    """Simulation run metadata."""

    __tablename__ = "simulation_runs"
    __table_args__ = (Index("ix_simulation_runs_timestamp", "started_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scenario: Mapped[str] = mapped_column(String(100), nullable=False)
    intensity: Mapped[float] = mapped_column(Float, default=50.0)
    crowd_size: Mapped[int] = mapped_column(Integer, default=500)
    location: Mapped[str] = mapped_column(String(200), default="Gate 2")
    status: Mapped[str] = mapped_column(String(50), default="STOPPED")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    stopped_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class SimulationEvent(Base):
    """Individual simulation event log."""

    __tablename__ = "simulation_events"
    __table_args__ = (Index("ix_simulation_events_timestamp", "timestamp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    simulation_run_id: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
