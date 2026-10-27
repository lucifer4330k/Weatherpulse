import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "dags"))
from synthetic_weather import generate_stream
from weather_ingest import load_locations


class SyntheticWeatherTests(unittest.TestCase):
    def test_reproducible_and_isolated(self):
        locations = load_locations(ROOT / "backend/app/data/locations.json", limit=2)
        end_time = datetime(2026, 7, 1, 12, tzinfo=timezone.utc)
        first = list(generate_stream(locations, 30, 42, end_time))
        second = list(generate_stream(locations, 30, 42, end_time))
        self.assertEqual(len(first), 60)
        self.assertEqual([event["event_id"] for event in first],
                         [event["event_id"] for event in second])
        self.assertEqual([event["temperature"] for event in first],
                         [event["temperature"] for event in second])
        self.assertTrue(all(event["source"] == "synthetic" for event in first))
        self.assertTrue(all(event["generation_method"] == "seeded-seasonal-v1" for event in first))
        self.assertTrue(any(event["precipitation"] == 0 for event in first))
        self.assertTrue(any(event["precipitation"] > 0 for event in first))
        for event in first:
            self.assertTrue(0 <= event["humidity"] <= 100)
            self.assertTrue(0 <= event["precipitation"])
            self.assertTrue(event["wind_gust"] >= event["wind_speed"])
            self.assertTrue(0 <= event["wind_direction_degrees"] < 360)


if __name__ == "__main__":
    unittest.main()
