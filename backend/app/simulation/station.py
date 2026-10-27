from __future__ import annotations

"""Railway station digital twin layout."""

from app.core.types import Zone

STATION_ZONES: list[Zone] = [
    Zone("Platform 1", 10, 10, 40, 30, capacity=300),
    Zone("Platform 2", 10, 70, 40, 90, capacity=300),
    Zone("Main Corridor", 45, 10, 60, 90, capacity=400),
    Zone("Gate 1", 65, 10, 85, 25, is_exit=True, capacity=150),
    Zone("Gate 2", 65, 30, 85, 45, is_exit=True, capacity=150),
    Zone("Gate 3", 65, 55, 85, 70, is_exit=True, capacity=150),
    Zone("Gate 4", 65, 75, 85, 90, is_exit=True, capacity=150),
    Zone("Service Area", 48, 40, 58, 55, is_restricted=True, capacity=20),
]

ZONE_BY_NAME = {z.name: z for z in STATION_ZONES}
EXIT_ZONES = [z for z in STATION_ZONES if z.is_exit]
RESTRICTED_ZONES = [z for z in STATION_ZONES if z.is_restricted]


def zone_at(x: float, y: float) -> str:
    for zone in STATION_ZONES:
        if zone.contains(x, y):
            return zone.name
    return "Open Area"


def is_in_restricted(x: float, y: float) -> bool:
    return any(z.contains(x, y) for z in RESTRICTED_ZONES)
