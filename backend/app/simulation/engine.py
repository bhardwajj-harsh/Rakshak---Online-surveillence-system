from __future__ import annotations

"""Simulation engine — generates person movement and hazard events.

All outputs are SIMULATION-DERIVED, not real ML inference.
"""

import math
import random
from typing import List, Optional

from app.core.types import (
    Detection,
    ScenarioType,
    SimulatedIncident,
    TrackedPerson,
)
from app.simulation.station import EXIT_ZONES, ZONE_BY_NAME, is_in_restricted, zone_at


class SimulationEngine:
    """Tick-based crowd and hazard simulation for demo scenarios."""

    TICK_RATE = 5  # updates per second

    def __init__(self):
        self.people: List[TrackedPerson] = []
        self.scenario = ScenarioType.NORMAL
        self.intensity = 50.0
        self.crowd_size = 300
        self.incident_location = "Gate 2"
        self.tick = 0
        self.elapsed = 0.0
        self.running = False
        self.fire_active = False
        self.fire_location = "Gate 2"
        self.intrusion_active = False
        self.intervention_active = False
        self._next_track_id = 1
        self._rng = random.Random(42)

    def configure(
        self,
        scenario: ScenarioType,
        intensity: float = 50.0,
        crowd_size: int = 300,
        incident_location: str = "Gate 2",
    ):
        self.scenario = scenario
        self.intensity = max(0, min(100, intensity))
        self.crowd_size = max(50, min(5000, crowd_size))
        self.incident_location = incident_location
        if scenario == ScenarioType.FIRE:
            self.fire_location = incident_location
        elif scenario == ScenarioType.MULTI_HAZARD:
            self.fire_location = "Gate 2"

    def start(self):
        self.running = True
        self.tick = 0
        self.elapsed = 0.0
        self.fire_active = self.scenario in (ScenarioType.FIRE, ScenarioType.MULTI_HAZARD)
        self.intrusion_active = self.scenario in (ScenarioType.RESTRICTED_INTRUSION, ScenarioType.MULTI_HAZARD)
        self.intervention_active = False
        self._spawn_crowd()

    def stop(self):
        self.running = False

    def apply_intervention(self, active: bool = True):
        """Simulate RAKSHAK response — redirect crowd away from hazard."""
        self.intervention_active = active

    def _spawn_crowd(self):
        self.people = []
        self._next_track_id = 1
        spawn_zones = ["Platform 1", "Platform 2", "Main Corridor"]
        for _ in range(self.crowd_size):
            zone_name = self._rng.choice(spawn_zones)
            zone = ZONE_BY_NAME[zone_name]
            x = self._rng.uniform(zone.x_min + 1, zone.x_max - 1)
            y = self._rng.uniform(zone.y_min + 1, zone.y_max - 1)
            self.people.append(
                TrackedPerson(
                    track_id=self._next_track_id,
                    x=x,
                    y=y,
                    first_seen=0.0,
                    last_seen=0.0,
                )
            )
            self._next_track_id += 1

    def tick_update(self, dt: float = 0.2) -> tuple[List[Detection], List[SimulatedIncident]]:
        """Advance simulation one tick. Returns detections and incidents."""
        if not self.running:
            return [], []

        self.tick += 1
        self.elapsed += dt
        detections: List[Detection] = []
        incidents: List[SimulatedIncident] = []

        self._update_scenario_state()
        self._move_people(dt)
        self._update_person_flags()

        # Fire detection (simulation fallback — clearly labeled)
        if self.fire_active:
            fire_conf = min(95.0, 60.0 + self.intensity * 0.35 + self.elapsed * 2)
            detections.append(
                Detection(
                    detection_type="FIRE",
                    confidence=fire_conf,
                    location=self.fire_location,
                    source="SIMULATION",
                )
            )
            if self.tick % 10 == 1:
                incidents.append(
                    SimulatedIncident(
                        incident_type="FIRE",
                        severity=self._severity_from_confidence(fire_conf),
                        confidence=fire_conf,
                        location=self.fire_location,
                        detected_factors=[f"Fire simulation active at {self.fire_location}"],
                    )
                )

        # Restricted zone intrusion
        intruders = [p for p in self.people if p.in_restricted_zone]
        if intruders:
            intrusion_conf = min(90.0, 50.0 + len(intruders) * 5 + self.intensity * 0.2)
            detections.append(
                Detection(
                    detection_type="RESTRICTED_ZONE_INTRUSION",
                    confidence=intrusion_conf,
                    location="Service Area",
                    track_id=intruders[0].track_id,
                    source="SIMULATION",
                )
            )
            if self.tick % 15 == 1:
                incidents.append(
                    SimulatedIncident(
                        incident_type="RESTRICTED_INTRUSION",
                        severity=self._severity_from_confidence(intrusion_conf),
                        confidence=intrusion_conf,
                        location="Service Area",
                        detected_factors=[f"{len(intruders)} person(s) in restricted zone"],
                    )
                )

        # Crowd anomaly detection
        gate2_zone = ZONE_BY_NAME.get("Gate 2")
        if gate2_zone:
            gate2_count = sum(1 for p in self.people if gate2_zone.contains(p.x, p.y))
            density_ratio = gate2_count / max(gate2_zone.capacity, 1)
            if density_ratio > 0.5:
                crowd_conf = min(95.0, density_ratio * 100)
                if self.tick % 12 == 1:
                    incidents.append(
                        SimulatedIncident(
                            incident_type="CROWD_ANOMALY",
                            severity=self._severity_from_confidence(crowd_conf),
                            confidence=crowd_conf,
                            location="Gate 2",
                            detected_factors=[
                                f"Gate 2 occupancy at {density_ratio * 100:.0f}% of capacity"
                            ],
                        )
                    )

        return detections, incidents

    def _update_scenario_state(self):
        t = self.elapsed
        intensity_factor = self.intensity / 100.0

        if self.scenario == ScenarioType.NORMAL:
            self.fire_active = False
            self.intrusion_active = False

        elif self.scenario == ScenarioType.FIRE:
            self.fire_active = True
            self.fire_location = self.incident_location

        elif self.scenario == ScenarioType.CROWD_SURGE:
            self.fire_active = False
            # Surge kicks in after 3 seconds
            if t > 3.0:
                self._inject_surge()

        elif self.scenario == ScenarioType.RESTRICTED_INTRUSION:
            self.fire_active = False
            if t > 2.0:
                self.intrusion_active = True
                self._move_intruder_to_restricted()

        elif self.scenario == ScenarioType.MULTI_HAZARD:
            # Phase 1: Fire at Gate 2 (t > 2s)
            # Phase 2: Crowd moves toward Gate 2 (automatic via _move_people)
            # Phase 3: Congestion builds
            # Phase 4: Intervention can reduce risk
            self.fire_active = t > 2.0
            self.fire_location = "Gate 2"

    def _inject_surge(self):
        """Add extra people near a random exit."""
        target = ZONE_BY_NAME.get(self.incident_location, EXIT_ZONES[0])
        surge_count = int(20 * (self.intensity / 50.0))
        for _ in range(surge_count):
            if len(self.people) >= self.crowd_size + 100:
                break
            x = self._rng.uniform(target.x_min, target.x_max)
            y = self._rng.uniform(target.y_min, target.y_max)
            self.people.append(
                TrackedPerson(
                    track_id=self._next_track_id,
                    x=x,
                    y=y,
                    first_seen=self.elapsed,
                    last_seen=self.elapsed,
                )
            )
            self._next_track_id += 1

    def _move_intruder_to_restricted(self):
        """Move one person into restricted zone."""
        if not self.people:
            return
        intruder = self.people[0]
        restricted = ZONE_BY_NAME["Service Area"]
        intruder.x = (restricted.x_min + restricted.x_max) / 2
        intruder.y = (restricted.y_min + restricted.y_max) / 2

    def _move_people(self, dt: float):
        base_speed = 1.5 + (self.intensity / 100.0) * 2.0

        for person in self.people:
            target_x, target_y = self._compute_target(person)

            dx = target_x - person.x
            dy = target_y - person.y
            dist = math.sqrt(dx * dx + dy * dy) + 0.001

            speed = base_speed
            if self.scenario in (ScenarioType.CROWD_SURGE, ScenarioType.MULTI_HAZARD):
                if self.elapsed > 3.0:
                    speed *= 1.5 + intensity_boost(self.intensity)

            # Apply velocity with smoothing
            desired_vx = (dx / dist) * speed
            desired_vy = (dy / dist) * speed
            person.vx = person.vx * 0.7 + desired_vx * 0.3
            person.vy = person.vy * 0.7 + desired_vy * 0.3

            # Add small random jitter
            person.vx += self._rng.uniform(-0.3, 0.3)
            person.vy += self._rng.uniform(-0.3, 0.3)

            person.x += person.vx * dt
            person.y += person.vy * dt

            # Clamp to station bounds
            person.x = max(5, min(95, person.x))
            person.y = max(5, min(95, person.y))
            person.last_seen = self.elapsed

    def _compute_target(self, person: TrackedPerson) -> tuple[float, float]:
        """Determine movement target based on scenario and evacuation intervention."""
        if self.intervention_active:
            from app.services.evacuation import evacuation_engine
            current_zone = zone_at(person.x, person.y)
            return evacuation_engine.get_egress_target(
                person.x,
                person.y,
                current_zone,
                fire_active=self.fire_active,
                fire_location=self.fire_location,
            )

        if self.scenario == ScenarioType.NORMAL:
            # Random walk within current zone
            zone_name = zone_at(person.x, person.y)
            zone = ZONE_BY_NAME.get(zone_name)
            if zone:
                return (
                    self._rng.uniform(zone.x_min + 1, zone.x_max - 1),
                    self._rng.uniform(zone.y_min + 1, zone.y_max - 1),
                )
            return person.x + self._rng.uniform(-5, 5), person.y + self._rng.uniform(-5, 5)

        if self.scenario == ScenarioType.FIRE:
            if self.fire_active:
                # Move away from fire
                fire_zone = ZONE_BY_NAME.get(self.fire_location)
                if fire_zone:
                    fx, fy = fire_zone.center
                    dx = person.x - fx
                    dy = person.y - fy
                    dist = math.sqrt(dx * dx + dy * dy) + 0.001
                    return person.x + (dx / dist) * 20, person.y + (dy / dist) * 20
            return person.x + self._rng.uniform(-3, 3), person.y + self._rng.uniform(-3, 3)

        if self.scenario == ScenarioType.CROWD_SURGE:
            target = ZONE_BY_NAME.get(self.incident_location, EXIT_ZONES[0])
            return target.center

        if self.scenario == ScenarioType.RESTRICTED_INTRUSION:
            if self.intrusion_active and person.track_id == 1:
                restricted = ZONE_BY_NAME["Service Area"]
                return restricted.center
            zone_name = zone_at(person.x, person.y)
            zone = ZONE_BY_NAME.get(zone_name)
            if zone:
                return (
                    self._rng.uniform(zone.x_min + 1, zone.x_max - 1),
                    self._rng.uniform(zone.y_min + 1, zone.y_max - 1),
                )
            return person.x, person.y

        if self.scenario == ScenarioType.MULTI_HAZARD:
            if self.fire_active:
                fire_zone = ZONE_BY_NAME.get("Gate 2")
                if fire_zone:
                    if self.intervention_active:
                        # Redirect to Gate 4 (RAKSHAK intervention)
                        gate4 = ZONE_BY_NAME["Gate 4"]
                        return gate4.center
                    else:
                        # Curiosity / congestion — crowd moves TOWARD fire (realistic panic behavior)
                        fx, fy = fire_zone.center
                        # Mix of moving toward and away
                        toward_weight = 0.6 + (self.intensity / 200.0)
                        if self._rng.random() < toward_weight:
                            return fx + self._rng.uniform(-3, 3), fy + self._rng.uniform(-3, 3)
                        else:
                            dx = person.x - fx
                            dy = person.y - fy
                            dist = math.sqrt(dx * dx + dy * dy) + 0.001
                            return person.x + (dx / dist) * 15, person.y + (dy / dist) * 15

            zone_name = zone_at(person.x, person.y)
            zone = ZONE_BY_NAME.get(zone_name)
            if zone:
                return (
                    self._rng.uniform(zone.x_min + 1, zone.x_max - 1),
                    self._rng.uniform(zone.y_min + 1, zone.y_max - 1),
                )

        return person.x + self._rng.uniform(-3, 3), person.y + self._rng.uniform(-3, 3)

    def _update_person_flags(self):
        for person in self.people:
            person.in_restricted_zone = is_in_restricted(person.x, person.y)
            person.is_stationary = person.speed < 0.5

    @staticmethod
    def _severity_from_confidence(conf: float):
        from app.core.types import Severity
        if conf >= 85:
            return Severity.CRITICAL
        if conf >= 65:
            return Severity.HIGH
        if conf >= 40:
            return Severity.MEDIUM
        return Severity.LOW


def intensity_boost(intensity: float) -> float:
    return (intensity / 100.0) * 0.5
