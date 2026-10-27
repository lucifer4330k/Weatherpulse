"""Resolve a reviewed India city list once; the Airflow DAG never geocodes at run time.

Run with --write after inspecting the resolved coverage. Coordinates come from
Open-Meteo's India-filtered geocoding service and are checked against the
committed geoBoundaries state polygons before entering the collection registry.
"""

import argparse
import json
import re
import time
from pathlib import Path

import httpx
from shapely.geometry import Point, shape

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "backend/app/data/locations.json"
SEED = ROOT / "scripts/location_candidates.json"
STATES = ROOT / "frontend/public/geojson/india-states.geojson"
DISTRICTS = ROOT / "frontend/public/geojson/india-districts.geojson"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


def features_by_code(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    return {feature["properties"]["code"]: feature for feature in data["features"]}


def fetch_candidates(client, query):
    for attempt in range(3):
        try:
            response = client.get(GEOCODE_URL, params={
                "name": query, "count": 20, "countryCode": "IN", "language": "en",
            })
            response.raise_for_status()
            return response.json().get("results", [])
        except (httpx.TimeoutException, httpx.TransportError, httpx.HTTPStatusError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def resolve_registry(client, seed, existing, states, districts):
    old = {item["city"].casefold(): item for item in existing}
    state_shapes = {code: shape(feature["geometry"]) for code, feature in states.items()}
    district_shapes = [(feature["properties"], shape(feature["geometry"]))
                       for feature in districts]
    resolved = []
    failures = []
    for candidate in seed:
        code, city = candidate["state_code"], candidate["city"]
        if code not in states:
            raise ValueError(f"Unknown state code: {code}")
        previous = old.get(city.casefold())
        if previous and previous["state_code"] != code:
            raise ValueError(f"Existing {city} state code changed")
        result = None
        if previous:
            latitude, longitude = previous["latitude"], previous["longitude"]
            coordinate_source = previous.get("coordinate_source", "reviewed-original-registry")
            geocode_id = previous.get("geocode_id")
        else:
            try:
                options = fetch_candidates(client, candidate.get("query", city))
            except Exception as exc:
                failures.append(f"{code}/{city}: geocoding failed: {exc}")
                continue
            matches = [item for item in options if item.get("country_code") == "IN"
                       and state_shapes[code].covers(Point(item["longitude"], item["latitude"]))]
            query = candidate.get("query", city).casefold()
            matches.sort(key=lambda item: (
                item["name"].casefold() != query,
                not item.get("feature_code", "").startswith("PPL"),
                -(item.get("population") or 0),
            ))
            if not matches:
                failures.append(f"{code}/{city}: no India geocoder result inside state polygon")
                continue
            result = matches[0]
            latitude, longitude = result["latitude"], result["longitude"]
            coordinate_source = "open-meteo-geocoding-geonames"
            geocode_id = result["id"]
        point = Point(longitude, latitude)
        if not state_shapes[code].covers(point):
            failures.append(f"{code}/{city}: coordinate is outside its state polygon")
            continue
        district = next((props["name"] for props, polygon in district_shapes
                         if props["state_code"] == code and polygon.covers(point)), None)
        slug = re.sub(r"[^a-z0-9]+", "-", city.casefold()).strip("-")
        resolved.append({
            "id": previous["id"] if previous else f"in-{code.lower()}-{slug}",
            "city": city, "state_code": code, "state": states[code]["properties"]["name"],
            "district": district, "latitude": round(float(latitude), 5),
            "longitude": round(float(longitude), 5),
            "primary": bool(candidate.get("primary")),
            "coordinate_source": coordinate_source, "geocode_id": geocode_id,
        })
        if result is not None:
            time.sleep(0.1)
    return resolved, failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Replace the registry only after all locations validate")
    args = parser.parse_args()
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    existing = json.loads(REGISTRY.read_text(encoding="utf-8"))
    states = features_by_code(STATES)
    districts = json.loads(DISTRICTS.read_text(encoding="utf-8"))["features"]
    with httpx.Client(timeout=20, headers={"User-Agent": "WeatherPulse registry builder/1.0"}) as client:
        resolved, failures = resolve_registry(client, seed, existing, states, districts)
    primary_codes = {item["state_code"] for item in resolved if item["primary"]}
    if len({item["city"].casefold() for item in resolved}) != len(resolved):
        failures.append("Duplicate city names would collide in Cassandra's city partition key")
    if len({item["id"] for item in resolved}) != len(resolved):
        failures.append("Duplicate location IDs")
    if primary_codes != set(states):
        failures.append(f"Primary coverage missing: {sorted(set(states) - primary_codes)}")
    print(f"Resolved {len(resolved)}/{len(seed)} locations across {len(primary_codes)}/36 states and UTs")
    for failure in failures:
        print("ERROR", failure)
    if failures:
        raise SystemExit(1)
    if args.write:
        REGISTRY.write_text(json.dumps(resolved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {REGISTRY}")


if __name__ == "__main__":
    main()
