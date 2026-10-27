"""Open-Meteo observation contract shared by Airflow and unit tests."""

import hashlib
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_REGISTRY = Path(__file__).resolve().parents[1] / "backend/app/data/locations.json"
CURRENT_FIELDS = (
    "temperature_2m,relative_humidity_2m,precipitation,weather_code,"
    "wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,"
    "apparent_temperature,cloud_cover,is_day"
)


def load_locations(path=None, limit=None):
    registry = Path(path or os.getenv("WEATHER_LOCATIONS_FILE", DEFAULT_REGISTRY))
    locations = json.loads(registry.read_text(encoding="utf-8"))
    if not isinstance(locations, list) or not locations:
        raise ValueError("Location registry must contain at least one location")
    seen = set()
    cities = set()
    for location in locations:
        required = ("id", "city", "state_code", "state", "latitude", "longitude")
        if any(location.get(field) is None for field in required):
            raise ValueError(f"Incomplete location registry entry: {location!r}")
        if (location["id"] in seen or location["city"].casefold() in cities or
                not 6 <= float(location["latitude"]) <= 38 or
                not 68 <= float(location["longitude"]) <= 98):
            raise ValueError(f"Duplicate ID/city or non-Indian coordinates: {location['id']}")
        seen.add(location["id"])
        cities.add(location["city"].casefold())
    return locations[:limit] if limit is not None else locations


def utc_iso(value):
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat(timespec="seconds")


def optional_float(data, key):
    return float(data[key]) if data.get(key) is not None else None


def normalize_event(location, payload, ingested_at=None):
    current = payload.get("current")
    if not isinstance(current, dict):
        raise ValueError("Open-Meteo response has no current observation")
    missing = [field for field in ("time", "temperature_2m", "relative_humidity_2m") if current.get(field) is None]
    if missing:
        raise ValueError(f"{location['city']}: missing {', '.join(missing)}")
    observed_at = utc_iso(current["time"])
    temperature = float(current["temperature_2m"])
    humidity = int(current["relative_humidity_2m"])
    precipitation = optional_float(current, "precipitation")
    wind_speed = optional_float(current, "wind_speed_10m")
    wind_gust = optional_float(current, "wind_gusts_10m")
    direction = current.get("wind_direction_10m")
    pressure = optional_float(current, "surface_pressure")
    cloud_cover = current.get("cloud_cover")
    if not -30 <= temperature <= 60 or not 0 <= humidity <= 100:
        raise ValueError(f"{location['city']}: implausible temperature or humidity")
    if (precipitation is not None and precipitation < 0 or
            wind_speed is not None and wind_speed < 0 or
            wind_gust is not None and wind_gust < 0 or
            pressure is not None and not 500 <= pressure <= 1100 or
            direction is not None and not 0 <= float(direction) <= 360 or
            cloud_cover is not None and not 0 <= int(cloud_cover) <= 100):
        raise ValueError(f"{location['city']}: implausible current observation")
    station_id = f"open-meteo-{location['id']}"
    event_id = hashlib.sha256(f"open-meteo|{station_id}|{observed_at}".encode()).hexdigest()
    labels = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
    return {
        "event_id": event_id, "station_id": station_id,
        "timestamp": observed_at, "source_timestamp": observed_at,
        "ingested_at": utc_iso(ingested_at or datetime.now(timezone.utc).isoformat()),
        "source": "open-meteo",
        "location": {
            "id": location["id"], "city": location["city"],
            "state_code": location["state_code"], "state": location["state"],
            "district": location.get("district"), "country": "India",
            "latitude": float(location["latitude"]), "longitude": float(location["longitude"]),
        },
        "temperature": temperature,
        "humidity": humidity,
        "feels_like": optional_float(current, "apparent_temperature"),
        "pressure": pressure,
        "wind_speed": wind_speed,
        "wind_gust": wind_gust,
        "wind_direction": labels[round(float(direction) / 45) % 8] if direction is not None else None,
        "wind_direction_degrees": int(direction) if direction is not None else None,
        "precipitation": precipitation,
        "weather_condition": str(current["weather_code"]) if current.get("weather_code") is not None else None,
        "weather_code": int(current["weather_code"]) if current.get("weather_code") is not None else None,
        "is_day": bool(current["is_day"]) if current.get("is_day") is not None else None,
        "cloud_cover": int(current["cloud_cover"]) if current.get("cloud_cover") is not None else None,
    }


def fetch_weather_event(location, opener=None, attempts=3):
    params = urllib.parse.urlencode({
        "latitude": location["latitude"], "longitude": location["longitude"],
        "current": CURRENT_FIELDS, "timezone": "UTC", "wind_speed_unit": "kmh",
        "precipitation_unit": "mm",
    })
    request = urllib.request.Request(
        f"https://api.open-meteo.com/v1/forecast?{params}",
        headers={"User-Agent": "WeatherPulse/1.0"},
    )
    opener = opener or urllib.request.urlopen
    for attempt in range(attempts):
        try:
            with opener(request, timeout=10) as response:
                return normalize_event(location, json.load(response))
        except (OSError, ValueError):
            if attempt + 1 == attempts:
                raise
            time.sleep(min(2 ** attempt, 8))


def fetch_weather_batch(locations, opener=None, attempts=3):
    """Fetch up to 10 points in one provider request, preserving input order."""
    if not 1 <= len(locations) <= 10:
        raise ValueError("A weather batch must contain between 1 and 10 locations")
    params = urllib.parse.urlencode({
        "latitude": ",".join(str(item["latitude"]) for item in locations),
        "longitude": ",".join(str(item["longitude"]) for item in locations),
        "current": CURRENT_FIELDS, "timezone": "UTC", "wind_speed_unit": "kmh",
        "precipitation_unit": "mm",
    })
    request = urllib.request.Request(
        f"https://api.open-meteo.com/v1/forecast?{params}",
        headers={"User-Agent": "WeatherPulse/1.0"},
    )
    opener = opener or urllib.request.urlopen
    for attempt in range(attempts):
        try:
            with opener(request, timeout=20) as response:
                payloads = json.load(response)
            if len(locations) == 1 and isinstance(payloads, dict):
                payloads = [payloads]
            if not isinstance(payloads, list) or len(payloads) != len(locations):
                raise ValueError("Open-Meteo batch response count does not match requested locations")
            return [normalize_event(location, payload)
                    for location, payload in zip(locations, payloads)]
        except (OSError, ValueError):
            if attempt + 1 == attempts:
                raise
            time.sleep(min(2 ** attempt, 8))
