from __future__ import annotations

"""WebSocket live state broadcast handler."""

import asyncio
import json
import logging
from typing import List, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.pipeline import pipeline

logger = logging.getLogger("rakshak.websocket")

ws_router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts live pipeline state."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        pipeline.subscribe(self.broadcast_state)

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        # Send immediate current state upon connection
        try:
            payload = pipeline.get_message_payload()
            await websocket.send_json(payload)
        except Exception as e:
            logger.warning(f"Error sending initial live state: {e}")
            await self.disconnect(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)

    async def broadcast_state(self, message: dict):
        """Non-blocking concurrent broadcast to all connected WebSocket clients."""
        async with self._lock:
            if not self.active_connections:
                return
            connections = list(self.active_connections)

        payload = message
        if "type" not in message:
            payload = {
                "type": "LIVE_STATE",
                "version": 1,
                "timestamp": message.get("timestamp"),
                "data": message,
            }

        async def _send(ws: WebSocket) -> WebSocket | None:
            try:
                await ws.send_json(payload)
                return None
            except Exception:
                return ws

        # Concurrently send to all active connections without blocking loop
        results = await asyncio.gather(*[_send(conn) for conn in connections], return_exceptions=True)

        failed_conns = [res for res in results if isinstance(res, WebSocket)]
        if failed_conns:
            async with self._lock:
                for dead_ws in failed_conns:
                    self.active_connections.discard(dead_ws)


manager = ConnectionManager()


@ws_router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    """WebSocket endpoint for streaming real-time simulation and intelligence data."""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug(f"WebSocket client disconnected: {e}")
    finally:
        await manager.disconnect(websocket)
