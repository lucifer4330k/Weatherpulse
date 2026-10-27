# WeatherPulse verification — 27 October 2026

The following checks were executed locally against the Docker Desktop Linux stack. They are evidence for this run only; they do not claim all behavior is error-free. Earlier 12-city observations below document the initial recovery; the latest 66-city results supersede those counts.

## Latest coverage and container recovery

| Check | Observed result |
| --- | --- |
| Registry validation | `scripts/build_location_registry.py --write` resolved 66/66 unique cities across 36/36 states and union territories, with one primary city per state/UT and 30 additional major cities. |
| Collector | `airflow dags test weather_data_streaming 2026-10-27` exited 0 and logged `Published 66/66 real observations to weather_data_real; failed=[]`. Batched provider calls and a per-city fallback addressed an intermittent TLS handshake timeout. Pressure validation now accepts a real 670.4 hPa Leh observation. |
| Cassandra persistence | The real table held Leh at `2026-10-27T14:15:00+00:00` with `pressure=670.40002`, `wind_gust=14.8`, and `source=open-meteo`; Shimla had `pressure=794.70001` and `wind_gust=8.3`. |
| API coverage | `/api/cassandra/cities` returned 66 cities; a single `/api/cassandra/latest/batch` request for all 66 returned 66 stored observations; `/api/india/overview` returned 36 states/UTs, 36 reporting states, and 66 reporting locations. Airflow's DAG listing reported `paused=False`. |
| Compose startup | The user's `docker compose up -d --build` exited 0 after the broker health grace period and retrying topic initializer were added. A later `docker compose ps` showed the default containers healthy or running, including broker, Cassandra, API, and frontend. |
| Frontend proxy recovery | After rebuilding Nginx and forcibly recreating only the backend container, the frontend's `/api/cassandra/cities` proxy returned 66 cities. Nginx now re-resolves Docker DNS after backend recreation; its configuration test passed. Before this fix the stale backend address produced HTTP 502. |
| Frontend map coverage | The map now adds persisted city coordinates absent from its static presentation catalog, so the 66 stored observations are eligible to render. The production React build passed. |
| Rendered React check | The national page rendered the 24.4°C sampled average, 36/66 reporting summary, state leaderboards, and the corrected 36-state reporting label. Clicking Ladakh opened **Leh** and displayed `Cassandra Stored Observation`, the persisted -2.1°C reading, 670.4 hPa surface pressure, and 14.8 km/h gust. This confirmed the state-card selection uses the stored city sample. |
| Later rendered refresh | A subsequent scheduled observation moved the national sampled average to 24.2°C. After the final React rebuild, the top summary's Ladakh button opened Leh with `Cassandra Stored Observation`, a formatted 14.4 km/h gust, coordinates, and the 30-minute scheduled collection label. |
| Streamlit browser check | The rebuilt overview displayed the same 24.2°C all-city average as React, `Reporting Cities 66/66`, and a separately labeled 36-primary-city digest with a 23.1°C mean. The API connection showed healthy. |

## Build and automated tests

| Check | Observed result |
| --- | --- |
| `docker compose config --quiet` | Passed. |
| React `npm run build` | TypeScript and Vite build passed; Vite reports a 1.54 MB JavaScript chunk (about 421 KB gzip). |
| Python `compileall` | Backend, DAGs, Spark script, and Streamlit compiled. |
| `pytest -q frontend/streamlit_dashboard/tests tests` | 46 passed after coverage, pressure, and batch-fetch tests were added. |
| React `npm run lint` | No errors; five React hook dependency warnings remain in `MapContainer.tsx`. |
| Collector unit tests | Mocked retry, outage, missing value, validation, provider timestamp, and stable event ID passed. |
| Synthetic generator test | Stable IDs/measurements, explicit source, bounds, zero and positive rain passed. |

## Real pipeline

| Stage | Observed result |
| --- | --- |
| Airflow import | `airflow dags list-import-errors` returned `No data found`. |
| Schedule | Existing DAG metadata was paused; explicitly unpaused it. New DAGs default unpaused in code. |
| Live provider collection | `airflow dags test weather_data_streaming 2026-10-27` succeeded. Log reported `Published 12/12 real observations to weather_data_real; failed=[]`. |
| Kafka | Topic initializer created `weather_data_real` with 3 partitions and a leader. Console consumer read a real Lucknow event with `source=open-meteo`, provider time, location ID, units, and gust. |
| Spark | Initial startup failed repeatedly with `UnknownTopicOrPartitionException` because the topic did not exist. After the initializer fix, Spark persisted events. A later restart exposed a saved-offset/broker-storage mismatch; Kafka and ZooKeeper now use named volumes and Spark uses a new checkpoint namespace. |
| Cassandra | Delhi row held provider time `2026-10-27T09:00:00+00:00`, `wind_gust=19.1`, and a stable event ID. Other sampled cities were present. |
| FastAPI | `/api/cassandra/latest?city=Delhi` returned the same Delhi row and gust. `/api/cassandra/cities` returned 12 cities. `/api/india/overview` returned 36 states/UTs and 12 reporting monitored locations. Delhi district endpoint returned 11 real polygons and one matched stored city sample. `/api/weather/dashboard?...&name=Delhi` returned `data_source=mixed`, `current.source=cassandra`, one stored historical point, and 48 provider forecast hours. |
| Route smoke pass | Health, readiness, Cassandra latest/batch/historical/cities, India overview/states/state/districts, provider current/forecast/historical, monitored dashboard, alerts, and name geocoding each returned HTTP 200 inside Docker. Reverse lookup initially returned an empty list for exact Delhi coordinates; this was traced to an unsupported provider request and replaced with a bounded monitored-point lookup. |
| Geocoding retest | Forward search for Delhi returned India (`IN`) results. The nearby monitored-point lookup returned Delhi with `feature_code=WP_MONITORED_POINT` for its exact coordinates; backend `/ready` remained healthy. |
| Redis | Container healthy and backend cache path used; outage fallback behavior was not injected in this run. |
| React delivery | Nginx `/api/cassandra/latest?city=Delhi` proxy returned the persisted record; built state/district GeoJSON served. Actual rendered values could not be inspected by browser automation. |
| Streamlit | Container healthy; Streamlit `AppTest` completed with zero exceptions against the live API. Full visual QA was not completed. |

## Isolated synthetic and recovery checks

The optional synthetic topic/table were used to avoid contaminating real weather data. A run published 10 seeded observations per city; Cassandra reported 10 rows for the Delhi partition. Replaying the same seed and fixed end time left the count at 10. Publishing one later observation increased it to 11. Synthetic records carried `source=synthetic`, `generation_method=seeded-seasonal-v1`, and `quality_flags=synthetic;not-observed`.

Cassandra was restarted without deleting its named volume. It became healthy again; the 11 synthetic Delhi records and the real Delhi gust row were still present. FastAPI subsequently returned the same real Delhi record. The default and optional Streamlit containers remained healthy.

Kafka broker and ZooKeeper were recreated with named volumes. The topic initializer recreated `weather_data_real`; Airflow published 12/12 observations, and Spark stored a Delhi row with provider time `2026-10-27T13:15:00+00:00`, gust `5.8`, ingestion time `13:21:07Z`, and processing time `13:21:50Z`. During a direct broker restart, the first broker startup hit ZooKeeper's transient `NodeExistsException`; the broker now has an automatic restart policy. Its subsequent startup retained Kafka topic ID `KhrS987BTWmvChtQ7S6LPQ`. Spark restarted and a second Airflow run updated the same Delhi provider-time row with ingestion and processing times `13:25:48Z`. The older `09:30Z` Delhi row was still present. No persistent volume was removed.

After the broker migration, the optional synthetic topic initializer ran, the synthetic Spark job started with its own new checkpoint namespace, and a seeded Delhi event at `13:30Z` appeared only in `weather_data_synthetic` with `source=synthetic` and `generation_method=seeded-seasonal-v1`. The optional job was then stopped to restore the lighter default stack.

## Remaining gaps

- React's national page, one state card, and Streamlit's overview were checked in a browser. Full responsive visual QA, map tile coverage, and screenshots remain unverified.
- Automated endpoint tests do not yet cover every FastAPI route, external-provider failure mode, or Redis outage. The full frontend has a production build, but no browser interaction test suite.
- Spark currently filters malformed events without a durable dead-letter queue or reject counters. Broker restart and Spark recovery were measured once, but longer outage and high-load recovery were not tested. Existing pre-fix broker messages that were not yet processed could not be recovered from its former ephemeral filesystem.
- Cassandra history is bounded to 2,000 rows per request without pagination or rollups. The backend still uses the synchronous Cassandra driver inside some async routes.
- The ADM1 and ADM2 boundary datasets represent different years and need manual review for changed districts. One district used nearest-state assignment.
- The direct provider historical endpoint remains for explicit coordinate exploration; the monitored-city dashboard and Streamlit history use Cassandra.
- Secret defaults and single-node infrastructure are development-only. The project has not been security hardened or load tested for production.
