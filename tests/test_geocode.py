import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.locations import nearest_monitored_locations


class GeocodeTests(unittest.TestCase):
    def test_reverse_lookup_only_matches_nearby_monitored_points(self):
        nearby = nearest_monitored_locations(28.6139, 77.2090)
        self.assertEqual(len(nearby), 1)
        self.assertEqual(nearby[0]["city"], "Delhi")
        self.assertEqual(nearest_monitored_locations(10.0, 75.0), [])
