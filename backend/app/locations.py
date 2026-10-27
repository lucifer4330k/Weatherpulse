"""Configured collection points, shared with Airflow through a Compose mount."""

import json
import math
from pathlib import Path

REGISTRY_PATH = Path(__file__).parent / "data" / "locations.json"


def monitored_locations():
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def location_for_city(city):
    normalized = city.strip().casefold()
    aliases = {
        "bangalore": "bengaluru", "gurgaon": "gurugram",
        "mysore": "mysuru", "mangalore": "mangaluru", "panjim": "panaji",
    }
    normalized = aliases.get(normalized, normalized)
    return next((location for location in monitored_locations()
                 if location["city"].casefold() == normalized), None)


def nearest_monitored_locations(lat, lon, limit=1, radius_km=50):
    """Find configured collection points near a coordinate, never infer an area."""
    candidates = []
    for location in monitored_locations():
        lat1, lat2 = math.radians(lat), math.radians(location["latitude"])
        delta_lat = lat2 - lat1
        delta_lon = math.radians(location["longitude"] - lon)
        arc = 2 * math.asin(min(1.0, math.sqrt(
            math.sin(delta_lat / 2) ** 2 +
            math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
        )))
        distance_km = 6371.0 * arc
        if distance_km <= radius_km:
            candidates.append((distance_km, location))
    candidates.sort(key=lambda item: item[0])
    return [location for _, location in candidates[:limit]]
