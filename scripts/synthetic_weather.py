"""Reproducible synthetic load for an isolated Kafka topic and Cassandra table.

Run explicitly with --publish inside the optional synthetic Compose profile.
The default command prints NDJSON and never publishes to the real topic.
"""

import argparse
import hashlib
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dags"))
from weather_ingest import load_locations, utc_iso

SYNTHETIC_TOPIC = "weather_data_synthetic"


def clamp(value, low, high):
    return max(low, min(high, value))


def generate_event(location, observed_at, rng, seed):
    """Correlate heat, humidity, rainfall, cloud, pressure, and wind."""
    month = observed_at.month
    monsoon = month in (6, 7, 8, 9)
    daily_phase = (observed_at.hour + observed_at.minute / 60 - 14) / 12
    seasonal = 1 if monsoon else 0
    baseline = 30 - 0.16 * (float(location["latitude"]) - 20) + seasonal
    temperature = clamp(baseline - 4 * abs(daily_phase) + rng.gauss(0, 1.7), 5, 47)
    raining = rng.random() < (0.18 if monsoon else 0.025)
    precipitation = round(rng.expovariate(0.7), 2) if raining else 0.0
    cloud_cover = int(clamp((70 if raining else 25) + rng.gauss(0, 16), 0, 100))
    humidity = int(clamp(68 - 2.1 * (temperature - 26) + (17 if raining else 0)
                         + rng.gauss(0, 7), 15, 100))
    wind_speed = round(clamp(rng.gauss(9, 3) + (5 if raining else 0), 0, 75), 1)
    wind_gust = round(wind_speed + rng.uniform(1, 9), 1)
    pressure = round(clamp(1012 - precipitation * 0.8 - wind_speed * 0.14
                           + rng.gauss(0, 3), 950, 1040), 1)
    direction = rng.randrange(0, 360)
    observed = utc_iso(observed_at.isoformat())
    station_id = f"synthetic-{location['id']}"
    event_id = hashlib.sha256(f"synthetic|{seed}|{station_id}|{observed}".encode()).hexdigest()
    return {
        "event_id": event_id, "station_id": station_id,
        "timestamp": observed, "source_timestamp": observed,
        "ingested_at": utc_iso(datetime.now(timezone.utc).isoformat()),
        "source": "synthetic", "generation_method": "seeded-seasonal-v1",
        "quality_flags": "synthetic;not-observed",
        "location": {"id": location["id"], "city": location["city"],
                     "state_code": location["state_code"], "state": location["state"],
                     "district": location.get("district"), "country": "India",
                     "latitude": location["latitude"], "longitude": location["longitude"]},
        "temperature": round(temperature, 1), "humidity": humidity,
        "feels_like": None, "pressure": pressure,
        "wind_speed": wind_speed, "wind_gust": wind_gust,
        "wind_direction": ("N", "NE", "E", "SE", "S", "SW", "W", "NW")[round(direction / 45) % 8],
        "wind_direction_degrees": direction,
        "precipitation": precipitation, "weather_condition": "synthetic rainfall" if raining else "synthetic dry",
        "weather_code": 61 if raining else (3 if cloud_cover > 70 else 1),
        "is_day": 6 <= observed_at.hour < 18, "cloud_cover": cloud_cover,
    }


def generate_stream(locations, per_location, seed, end_time):
    rng = random.Random(seed)
    for index in range(per_location):
        observed = end_time - timedelta(minutes=per_location - 1 - index)
        for location in locations:
            yield generate_event(location, observed, rng, seed)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--per-location", type=int, default=10)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--end-time", help="ISO UTC timestamp; useful for reproducible tests")
    args = parser.parse_args()
    if not 1 <= args.per_location <= 10000:
        parser.error("--per-location must be between 1 and 10000")
    registry = os.getenv("WEATHER_LOCATIONS_FILE") or Path(__file__).resolve().parents[1] / "backend/app/data/locations.json"
    locations = load_locations(path=registry)
    end_time = datetime.fromisoformat(args.end_time.replace("Z", "+00:00")) if args.end_time else datetime.now(timezone.utc).replace(second=0, microsecond=0)
    if end_time.tzinfo is None:
        parser.error("--end-time must include a UTC offset")
    producer = None
    if args.publish:
        from kafka import KafkaProducer
        producer = KafkaProducer(bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "broker:29092"),
                                 value_serializer=lambda event: json.dumps(event).encode(), acks="all", retries=5)
    try:
        for event in generate_stream(locations, args.per_location, args.seed, end_time.astimezone(timezone.utc)):
            if producer:
                producer.send(SYNTHETIC_TOPIC, key=event["station_id"].encode(), value=event).get(timeout=30)
            else:
                print(json.dumps(event))
    finally:
        if producer:
            producer.flush()
            producer.close()


if __name__ == "__main__":
    main()
