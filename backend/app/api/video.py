from __future__ import annotations

"""Video stream and multi-camera real perception API routes."""

import os
import shutil
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.ml.perception import perception_engine
from app.services.pipeline import pipeline

video_router = APIRouter(prefix="/api/video", tags=["video"])


class ModeSwitchRequest(BaseModel):
    data_source: str  # "SIMULATION" | "REAL_PERCEPTION"


@video_router.get("/stream/{camera_id}")
async def video_stream_camera(camera_id: int):
    """Live MJPEG stream of specific camera feed (0: MacBook Built-in, 1: iPhone Wireless)."""
    if camera_id not in (0, 1):
        camera_id = 0
    return StreamingResponse(
        perception_engine.generate_mjpeg_stream(camera_id=camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@video_router.get("/feed")
async def video_feed(camera: int = 0):
    """Live MJPEG stream of default camera feed (camera_id: 0)."""
    return StreamingResponse(
        perception_engine.generate_mjpeg_stream(camera_id=camera),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@video_router.get("/status")
async def video_status():
    """Returns real-time inference telemetry and multi-camera perception metadata."""
    metrics = perception_engine.get_metrics()
    metrics["current_pipeline_source"] = pipeline.state.data_source
    return metrics


@video_router.post("/mode")
async def switch_mode(request: ModeSwitchRequest):
    """Switch pipeline input between SIMULATION and REAL_PERCEPTION."""
    valid_modes = {"SIMULATION", "REAL_PERCEPTION"}
    if request.data_source not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid data source: {request.data_source}. Must be one of {valid_modes}",
        )
    pipeline.set_data_source(request.data_source)
    await pipeline._notify()
    return {"data_source": request.data_source, "status": "updated"}


@video_router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload pre-recorded CCTV MP4 video for perception inference."""
    if not file.filename.lower().endswith((".mp4", ".avi", ".mkv", ".mov")):
        raise HTTPException(status_code=400, detail="Only video files (.mp4, .avi) are supported")

    upload_dir = os.path.join(os.path.dirname(__file__), "..", "ml", "samples")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": file.filename, "status": "uploaded", "path": file_path}
