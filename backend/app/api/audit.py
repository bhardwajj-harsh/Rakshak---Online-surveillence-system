from __future__ import annotations

"""Post-Incident Audit API Router."""

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.services.audit import audit_service
from app.services.pipeline import pipeline

audit_router = APIRouter(prefix="/api/audit", tags=["audit"])


@audit_router.get("/report/latest")
async def get_latest_audit_report():
    """Returns the most recently generated or current post-incident analysis report."""
    return audit_service.get_latest_report(pipeline.state)


@audit_router.post("/report/generate")
async def generate_audit_report():
    """Explicitly synthesizes and saves a post-incident audit report."""
    return audit_service.generate_report(pipeline.state)


@audit_router.get("/report/markdown")
async def get_audit_report_markdown():
    """Exports formatted Markdown report."""
    report = audit_service.get_latest_report(pipeline.state)
    md = audit_service.generate_markdown(report)
    return PlainTextResponse(content=md, media_type="text/markdown")
