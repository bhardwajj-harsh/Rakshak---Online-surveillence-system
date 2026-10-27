"""Crowd intelligence — deterministic calculations from tracked persons."""

import math
from typing import Dict, List, Optional

from app.core.types import CrowdState, TrackedPerson
from app.simulation.station import EXIT_ZONES, STATION_ZONES


class CrowdIntelligence:
    """Calculates crowd metrics from person tracking data."""

    def __init__(self):
        self._prev_density: float = 0.0
        self._prev_time: float = 0.0

    def compute(
        self,
        people: List[TrackedPerson],
        elapsed: float,
    ) -> CrowdState:
        count = len(people)
        if count == 0:
            return CrowdState()

        # Zone densities
        zone_densities: Dict[str, float] = {}
        for zone in STATION_ZONES:
            zone_count = sum(1 for p in people if zone.contains(p.x, p.y))
            occupancy = zone_count / max(zone.capacity, 1)
            zone_densities[zone.name] = min(100.0, occupancy * 100)

        # Overall density score (weighted by zone occupancy)
        total_area = sum(z.area for z in STATION_ZONES)
        density_score = min(100.0, (count / max(total_area / 100, 1)) * 10)

        # Also factor in max zone congestion
        max_zone_density = max(zone_densities.values()) if zone_densities else 0
        density_score = min(100.0, density_score * 0.4 + max_zone_density * 0.6)

        # Average speed (normalized 0-100, assuming max ~5 units/s)
        speeds = [p.speed for p in people]
        avg_speed = sum(speeds) / len(speeds)
        average_speed = min(100.0, (avg_speed / 5.0) * 100)

        # Movement direction and variance
        directions = [p.direction for p in people if p.speed > 0.1]
        dominant_direction = 0.0
        movement_variance = 0.0
        if directions:
            sin_sum = sum(math.sin(d) for d in directions)
            cos_sum = sum(math.cos(d) for d in directions)
            dominant_direction = math.atan2(sin_sum, cos_sum)
            # Circular variance
            r = math.sqrt(sin_sum**2 + cos_sum**2) / len(directions)
            movement_variance = min(100.0, (1 - r) * 100)

        # Density change rate (points per minute)
        density_change_rate = 0.0
        dt = elapsed - self._prev_time
        if dt > 0 and self._prev_time > 0:
            density_change_rate = ((density_score - self._prev_density) / dt) * 60
        self._prev_density = density_score
        self._prev_time = elapsed

        # Exit congestion score
        congestion_score = self._compute_exit_congestion(people, zone_densities)

        return CrowdState(
            total_people=count,
            density_score=round(density_score, 1),
            average_speed=round(average_speed, 1),
            movement_variance=round(movement_variance, 1),
            dominant_direction=round(dominant_direction, 3),
            density_change_rate=round(density_change_rate, 1),
            congestion_score=round(congestion_score, 1),
            zone_densities=zone_densities,
        )

    def _compute_exit_congestion(
        self,
        people: List[TrackedPerson],
        zone_densities: Dict[str, float],
    ) -> float:
        exit_densities = [
            zone_densities.get(z.name, 0) for z in EXIT_ZONES
        ]
        if not exit_densities:
            return 0.0
        return max(exit_densities)

    def reset(self):
        self._prev_density = 0.0
        self._prev_time = 0.0
