import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.locations import location_for_city, monitored_locations


class LocationCoverageTests(unittest.TestCase):
    def test_every_state_has_one_primary_and_ids_are_unique(self):
        locations = monitored_locations()
        states = json.loads((ROOT / "frontend/public/geojson/india-states.geojson").read_text(encoding="utf-8"))
        codes = {feature["properties"]["code"] for feature in states["features"]}
        self.assertEqual(len(locations), 66)
        self.assertEqual({item["state_code"] for item in locations}, codes)
        self.assertEqual(len({item["id"] for item in locations}), len(locations))
        self.assertEqual(len({item["city"].casefold() for item in locations}), len(locations))
        self.assertEqual({item["state_code"] for item in locations if item["primary"]}, codes)
        for code in codes:
            self.assertEqual(sum(item["primary"] for item in locations if item["state_code"] == code), 1)

    def test_common_city_aliases_resolve_to_monitored_points(self):
        self.assertEqual(location_for_city("Panjim")["city"], "Panaji")
        self.assertEqual(location_for_city("Gurgaon")["city"], "Gurugram")
