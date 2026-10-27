from __future__ import annotations

"""Dynamic graph-based evacuation routing and egress pathfinding engine."""

import heapq
import math
from typing import Dict, List, Optional, Set, Tuple

from app.core.types import CrowdState, EvacuationRoute, Zone
from app.simulation.station import EXIT_ZONES, STATION_ZONES, ZONE_BY_NAME, zone_at


# Station topology graph definition
# Adjacent zone connections in the railway/metro station layout
STATION_TOPOLOGY: Dict[str, List[str]] = {
    "Platform 1": ["Main Corridor"],
    "Platform 2": ["Main Corridor"],
    "Main Corridor": [
        "Platform 1",
        "Platform 2",
        "Gate 1",
        "Gate 2",
        "Gate 3",
        "Gate 4",
        "Service Area",
    ],
    "Gate 1": ["Main Corridor"],
    "Gate 2": ["Main Corridor"],
    "Gate 3": ["Main Corridor"],
    "Gate 4": ["Main Corridor"],
    "Service Area": ["Main Corridor"],
}


class EvacuationEngine:
    """Calculates dynamic optimal evacuation routes using weighted Dijkstra pathfinding.

    Edge weights dynamically incorporate:
    - Euclidean distance between zone centroids
    - Real-time crowd density ratios (congestion penalty)
    - Active hazard penalties (fire outbreak, intrusion lock-down)
    """

    HAZARD_PENALTY: float = 1000.0

    def __init__(self):
        self.zones = ZONE_BY_NAME
        self.exit_zone_names: List[str] = [z.name for z in EXIT_ZONES]

    def compute_edge_cost(
        self,
        from_zone_name: str,
        to_zone_name: str,
        zone_densities: Dict[str, float],
        hazard_zones: Set[str],
    ) -> float:
        """Dynamic cost = distance * (1.0 + 2.0 * density_ratio) + (1000.0 if hazard)."""
        z1 = self.zones.get(from_zone_name)
        z2 = self.zones.get(to_zone_name)
        if not z1 or not z2:
            return 9999.0

        c1 = z1.center
        c2 = z2.center
        distance = math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2)

        to_density = zone_densities.get(to_zone_name, 0.0) / 100.0
        density_ratio = min(1.0, max(0.0, to_density))

        is_hazard = to_zone_name in hazard_zones or from_zone_name in hazard_zones
        hazard_cost = self.HAZARD_PENALTY if is_hazard else 0.0

        cost = distance * (1.0 + 2.0 * density_ratio) + hazard_cost
        return cost

    def find_shortest_path_to_exit(
        self,
        start_zone: str,
        zone_densities: Dict[str, float],
        hazard_zones: Set[str],
    ) -> Tuple[Optional[List[str]], float, Optional[str]]:
        """Dijkstra algorithm finding shortest cost path to any safe exit."""
        if start_zone in self.exit_zone_names and start_zone not in hazard_zones:
            return [start_zone], 0.0, start_zone

        # Priority queue: (total_cost, current_node, path)
        pq: List[Tuple[float, str, List[str]]] = [(0.0, start_zone, [start_zone])]
        visited: Dict[str, float] = {}

        best_path: Optional[List[str]] = None
        best_cost: float = float("inf")
        best_exit: Optional[str] = None

        while pq:
            cost, current, path = heapq.heappop(pq)

            if current in visited and visited[current] <= cost:
                continue
            visited[current] = cost

            # Check if we reached a candidate exit
            if current in self.exit_zone_names and current not in hazard_zones:
                if cost < best_cost:
                    best_cost = cost
                    best_path = path
                    best_exit = current
                    # If this exit is clear, we found the optimal
                    break

            for neighbor in STATION_TOPOLOGY.get(current, []):
                edge_cost = self.compute_edge_cost(
                    current, neighbor, zone_densities, hazard_zones
                )
                new_cost = cost + edge_cost
                if neighbor not in visited or new_cost < visited[neighbor]:
                    heapq.heappush(pq, (new_cost, neighbor, path + [neighbor]))

        # Fallback if all exits are in hazard zones: pick the lowest cost exit regardless
        if not best_path:
            pq = [(0.0, start_zone, [start_zone])]
            visited = {}
            while pq:
                cost, current, path = heapq.heappop(pq)
                if current in visited and visited[current] <= cost:
                    continue
                visited[current] = cost
                if current in self.exit_zone_names:
                    best_cost = cost
                    best_path = path
                    best_exit = current
                    break
                for neighbor in STATION_TOPOLOGY.get(current, []):
                    edge_cost = self.compute_edge_cost(
                        current, neighbor, zone_densities, hazard_zones
                    )
                    heapq.heappush(pq, (cost + edge_cost, neighbor, path + [neighbor]))

        return best_path, best_cost, best_exit

    def compute_evacuation_routes(
        self,
        crowd: CrowdState,
        fire_active: bool = False,
        fire_location: Optional[str] = None,
    ) -> Tuple[List[EvacuationRoute], List[str]]:
        """Computes evacuation routes for all station zones and identifies safe exits."""
        zone_densities = crowd.zone_densities or {}
        hazard_zones: Set[str] = set()

        if fire_active and fire_location:
            hazard_zones.add(fire_location)

        # Identify safe exits (exits without active fire and occupancy < 85%)
        safe_exits = [
            exit_name
            for exit_name in self.exit_zone_names
            if exit_name not in hazard_zones and zone_densities.get(exit_name, 0.0) < 85.0
        ]
        if not safe_exits and self.exit_zone_names:
            # Fallback to any non-fire exit
            safe_exits = [e for e in self.exit_zone_names if e not in hazard_zones] or self.exit_zone_names

        routes: List[EvacuationRoute] = []

        for zone in STATION_ZONES:
            start_name = zone.name
            path, cost, target_exit = self.find_shortest_path_to_exit(
                start_name, zone_densities, hazard_zones
            )

            if not path or not target_exit:
                continue

            to_zone = path[1] if len(path) > 1 else target_exit

            # Status determination
            is_blocked = (
                start_name in hazard_zones
                or to_zone in hazard_zones
                or target_exit in hazard_zones
            )
            dest_density = zone_densities.get(to_zone, 0.0)

            if is_blocked:
                status = "BLOCKED"
            elif dest_density > 60.0 or zone_densities.get(target_exit, 0.0) > 60.0:
                status = "CONGESTED"
            else:
                status = "CLEAR"

            # Estimate egress distance and time (assuming average speed ~2.5 m/s or units/s)
            est_time = round(cost / 3.0, 1) if cost < 1000.0 else round((cost - 1000.0) / 3.0 + 15.0, 1)

            routes.append(
                EvacuationRoute(
                    from_zone=start_name,
                    to_zone=to_zone,
                    status=status,
                    recommended_exit=target_exit,
                    path=path,
                    distance=round(cost if cost < 1000 else cost - 1000, 1),
                    estimated_time_seconds=est_time,
                )
            )

        return routes, safe_exits

    def get_egress_target(
        self,
        x: float,
        y: float,
        current_zone_name: str,
        fire_active: bool = False,
        fire_location: Optional[str] = None,
        zone_densities: Optional[Dict[str, float]] = None,
    ) -> Tuple[float, float]:
        """Calculates the specific (x, y) target coordinates for an agent to move toward."""
        hazard_zones: Set[str] = set()
        if fire_active and fire_location:
            hazard_zones.add(fire_location)

        densities = zone_densities or {}

        # If currently in a hazardous zone, flee toward Main Corridor center immediately
        if current_zone_name in hazard_zones:
            corridor = self.zones["Main Corridor"]
            return corridor.center

        path, _, best_exit = self.find_shortest_path_to_exit(
            current_zone_name, densities, hazard_zones
        )

        if not path or not best_exit:
            # Fallback to Gate 4 or Gate 1
            safe_exit = self.zones.get("Gate 4") or self.zones[self.exit_zone_names[0]]
            return safe_exit.center

        # If in exit zone already, move through the outer exit door (towards x ~ 85)
        if current_zone_name in self.exit_zone_names:
            exit_zone = self.zones[current_zone_name]
            return (exit_zone.x_max, exit_zone.center[1])

        # Next waypoint along optimal route
        next_zone_name = path[1] if len(path) > 1 else best_exit
        next_zone = self.zones.get(next_zone_name)
        if next_zone:
            return next_zone.center

        return (75.0, 85.0)  # Default towards Gate 4

    def get_inspection_data(
        self,
        crowd: CrowdState,
        fire_active: bool = False,
        fire_location: Optional[str] = None,
    ) -> dict:
        """Returns structured payload for REST inspection endpoint /api/evacuation/routes."""
        routes, safe_exits = self.compute_evacuation_routes(
            crowd, fire_active=fire_active, fire_location=fire_location
        )
        return {
            "routes": [
                {
                    "from_zone": r.from_zone,
                    "to_zone": r.to_zone,
                    "status": r.status,
                    "recommended_exit": r.recommended_exit,
                    "path": r.path,
                    "distance": r.distance,
                    "estimated_time_seconds": r.estimated_time_seconds,
                }
                for r in routes
            ],
            "safe_exits": safe_exits,
            "hazard_zones": [fire_location] if (fire_active and fire_location) else [],
            "graph_nodes": list(STATION_TOPOLOGY.keys()),
            "data_source": "SIMULATION",
        }


# Singleton evacuation engine instance
evacuation_engine = EvacuationEngine()
