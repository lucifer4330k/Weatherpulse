"""Normalize pinned geoBoundaries India ADM1/ADM2 releases for WeatherPulse.

The district release does not include a parent state ID. We spatially assign
the polygon's interior representative point to the matching ADM1 polygon.
Because releases represent different years, unmatched points use the nearest
state polygon and are counted in the output log. The raw source URLs and
licences are documented in README.md.
"""

import ast
import json
from pathlib import Path
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
GEO = ROOT / "frontend/public/geojson"
STATE_SOURCE = GEO / "geoboundaries-ind-adm1.geojson"
DISTRICT_SOURCE = GEO / "geoboundaries-ind-adm2.geojson"
STATE_TARGET = GEO / "india-states.geojson"
DISTRICT_TARGET = GEO / "india-districts.geojson"
CODE_ALIASES = {"TG": "TS", "UT": "UK"}


def state_names():
    tree = ast.parse((ROOT / "backend/app/routers/india.py").read_text(encoding="utf-8"))
    entries = next(ast.literal_eval(node.value) for node in tree.body
                   if isinstance(node, ast.Assign) and any(
                       isinstance(target, ast.Name) and target.id == "INDIAN_STATES"
                       for target in node.targets))
    return {entry["code"]: entry["name"] for entry in entries}


def write_collection(path, features):
    path.write_text(json.dumps({"type": "FeatureCollection", "features": features},
                               ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main():
    names = state_names()
    names["DH"] = "Dadra and Nagar Haveli and Daman and Diu"
    raw_states = json.loads(STATE_SOURCE.read_text(encoding="utf-8"))["features"]
    raw_districts = json.loads(DISTRICT_SOURCE.read_text(encoding="utf-8"))["features"]
    states = []
    state_shapes = []
    for feature in raw_states:
        source = feature["properties"]
        code = CODE_ALIASES.get(source["shapeISO"].split("-")[-1], source["shapeISO"].split("-")[-1])
        geometry = shape(feature["geometry"])
        point = geometry.representative_point()
        properties = {"code": code, "name": names.get(code, source["shapeName"]),
                      "source_id": source["shapeID"], "source": "geoBoundaries gbOpen ADM1",
                      "center": {"lat": point.y, "lon": point.x}}
        states.append({"type": "Feature", "properties": properties, "geometry": feature["geometry"]})
        state_shapes.append((code, geometry))

    districts = []
    nearest_assignments = 0
    for feature in raw_districts:
        geometry = shape(feature["geometry"])
        point = geometry.representative_point()
        containing = [(code, region) for code, region in state_shapes if region.covers(point)]
        if containing:
            code = min(containing, key=lambda pair: pair[1].area)[0]
        else:
            code = min(state_shapes, key=lambda pair: pair[1].distance(point))[0]
            nearest_assignments += 1
        source = feature["properties"]
        properties = {"code": source["shapeID"], "name": source["shapeName"],
                      "state_code": code, "source_id": source["shapeID"],
                      "source": "geoBoundaries gbOpen ADM2",
                      "center": {"lat": point.y, "lon": point.x}}
        districts.append({"type": "Feature", "properties": properties, "geometry": feature["geometry"]})

    write_collection(STATE_TARGET, states)
    write_collection(DISTRICT_TARGET, districts)
    print(f"States: {len(states)}, districts: {len(districts)}, nearest-state assignments: {nearest_assignments}")


if __name__ == "__main__":
    main()
