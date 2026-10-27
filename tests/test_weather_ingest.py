import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dags"))
from weather_ingest import fetch_weather_event, fetch_weather_batch, load_locations, normalize_event


class Response(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


class WeatherIngestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.location = load_locations(Path(__file__).resolve().parents[1] / "backend/app/data/locations.json")[0]

    def payload(self, **overrides):
        current = {"time": "2026-10-27T08:10", "temperature_2m": 27.5,
                   "relative_humidity_2m": 65, "precipitation": 0,
                   "wind_speed_10m": 12, "wind_gusts_10m": 21,
                   "wind_direction_10m": 90, "surface_pressure": 1008,
                   "apparent_temperature": 29, "cloud_cover": 25,
                   "weather_code": 2, "is_day": 1}
        current.update(overrides)
        return {"current": current}

    def test_deduplication_uses_provider_time_and_preserves_zero(self):
        first = normalize_event(self.location, self.payload(), "2026-10-27T08:11:00Z")
        retry = normalize_event(self.location, self.payload(), "2026-10-27T08:12:00Z")
        later = normalize_event(self.location, self.payload(time="2026-10-27T08:20"))
        self.assertEqual(first["event_id"], retry["event_id"])
        self.assertNotEqual(first["event_id"], later["event_id"])
        self.assertEqual(first["timestamp"], "2026-10-27T08:10:00+00:00")
        self.assertEqual(first["precipitation"], 0)
        self.assertEqual(first["source"], "open-meteo")

    def test_missing_optional_values_remain_null(self):
        event = normalize_event(self.location, self.payload(wind_gusts_10m=None,
                                  precipitation=None, apparent_temperature=None))
        self.assertIsNone(event["wind_gust"])
        self.assertIsNone(event["precipitation"])
        self.assertIsNone(event["feels_like"])

    def test_high_altitude_surface_pressure_is_valid(self):
        event = normalize_event(self.location, self.payload(surface_pressure=670.4))
        self.assertEqual(event["pressure"], 670.4)

    def test_batch_response_preserves_location_identity(self):
        locations = load_locations(Path(__file__).resolve().parents[1] / "backend/app/data/locations.json")[:2]

        def opener(request, timeout):
            self.assertEqual(timeout, 20)
            self.assertIn("latitude=", request.full_url)
            return Response(json.dumps([self.payload(), self.payload()]).encode())

        events = fetch_weather_batch(locations, opener=opener)
        self.assertEqual([event["location"]["id"] for event in events],
                         [location["id"] for location in locations])
        self.assertNotEqual(events[0]["event_id"], events[1]["event_id"])

    def test_invalid_values_are_rejected(self):
        for changes in ({"relative_humidity_2m": 120}, {"precipitation": -2},
                        {"temperature_2m": None}, {"surface_pressure": 300}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                normalize_event(self.location, self.payload(**changes))

    @patch("weather_ingest.time.sleep")
    def test_transient_failure_retries(self, _sleep):
        attempts = 0

        def opener(_request, timeout):
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise OSError("timeout")
            return Response(json.dumps(self.payload()).encode())

        event = fetch_weather_event(self.location, opener=opener)
        self.assertEqual(attempts, 2)
        self.assertEqual(event["temperature"], 27.5)

    @patch("weather_ingest.time.sleep")
    def test_permanent_outage_raises(self, _sleep):
        with self.assertRaises(OSError):
            fetch_weather_event(self.location, opener=lambda *_args, **_kwargs: (_ for _ in ()).throw(OSError("offline")))


if __name__ == "__main__":
    unittest.main()
