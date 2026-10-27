# Administrative boundary data

WeatherPulse's checked-in India boundary files are derived from the pinned [geoBoundaries gbOpen release](https://www.geoboundaries.org/api.html). Attribution is required by the source project.

| Layer | Metadata | Source version | Source license | Local output |
| --- | --- | --- | --- | --- |
| States and union territories (ADM1) | [IND ADM1 metadata](https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/) | `IND-ADM1-1811400`, source represents 2011 | Creative Commons Attribution 2.5 India | `frontend/public/geojson/india-states.geojson` |
| Districts (ADM2) | [IND ADM2 metadata](https://www.geoboundaries.org/api/current/gbOpen/IND/ADM2/) | `IND-ADM2-76128533`, source represents 2021 | Open Data Commons Open Database License 1.0 | `frontend/public/geojson/india-districts.geojson` |

The original simplified files are kept as `geoboundaries-ind-adm1.geojson` and `geoboundaries-ind-adm2.geojson` alongside the normalized outputs. `scripts/build_boundaries.py` adds application codes, names, interior representative points, and district parent codes while retaining the real geometries and source IDs. The resulting ADM2 derivative remains subject to ODbL attribution and share-alike conditions. The boundary data is not a governmental certification and should not be used for legal or official boundary decisions.

The ADM2 source does not include a parent state identifier. The script spatially joins each district interior point to ADM1 and uses the nearest state polygon for one unmatched district. The releases represent different years, so administrative changes and naming differences require a future manual review.
