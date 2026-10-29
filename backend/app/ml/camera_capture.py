"""Cross-platform camera open helpers (macOS AVFoundation warmup)."""

from __future__ import annotations

import logging
import platform
import time
from typing import Optional

import cv2

logger = logging.getLogger(__name__)


def capture_backend() -> int:
    """OpenCV backend appropriate for the host OS."""
    if platform.system() == "Darwin":
        return cv2.CAP_AVFOUNDATION
    return cv2.CAP_ANY


def open_camera(
    device_index: int,
    *,
    warmup_attempts: int = 30,
    warmup_delay_s: float = 0.05,
) -> Optional[cv2.VideoCapture]:
    """Open a camera device and confirm frames can be read (required on macOS)."""
    backend = capture_backend()
    cap = cv2.VideoCapture(device_index, backend)
    if not cap.isOpened():
        cap.release()
        return None

    try:
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    except Exception:
        pass

    for _ in range(warmup_attempts):
        ret, frame = cap.read()
        if ret and frame is not None and frame.size > 0:
            logger.info(
                "Camera device %s opened (%sx%s, backend=%s)",
                device_index,
                frame.shape[1],
                frame.shape[0],
                backend,
            )
            return cap
        time.sleep(warmup_delay_s)

    logger.warning("Camera device %s opened but no frames after warmup", device_index)
    cap.release()
    return None


def probe_available_indices(max_index: int = 2) -> list[int]:
    """Return device indices that deliver at least one frame."""
    found: list[int] = []
    for idx in range(max_index + 1):
        cap = open_camera(idx, warmup_attempts=15, warmup_delay_s=0.04)
        if cap is not None:
            found.append(idx)
            cap.release()
    return found
