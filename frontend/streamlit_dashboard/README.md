# WeatherPulse — India Weather Intelligence Dashboard (Streamlit)

> **Standalone analytics dashboard** that consumes the existing FastAPI backend and presents real-time weather monitoring, heatmaps, rainfall analytics, extreme-weather screening, historical trends, and pipeline-health information for India.

This dashboard is a **separate, additional application**. It does not modify the existing React frontend, FastAPI backend, Kafka/Spark/Cassandra pipeline, or Docker Compose configuration.

---

## Architecture

```
Open-Meteo API
      ↓
  Kafka → Spark → Cassandra   (existing data pipeline)
      ↓
  FastAPI Backend (port 8000)  (existing API)
      ↓
  Streamlit Dashboard          ← this application (port 8501)
```

The Streamlit app makes HTTP requests to the FastAPI backend's REST API.

---

## Quick Start

### 1. Prerequisites

| Component | Required |
|-----------|----------|
| Python 3.10+ | ✅ |
| FastAPI backend running on port 8000 | ✅ |
| Cassandra / Kafka / Redis | Optional — backend falls back gracefully |

### 2. Create a Virtual Environment

```bash
# From the repository root
cd frontend/streamlit_dashboard
python -m venv .venv

# Activate
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Backend URL
 
The dashboard defaults to `http://127.0.0.1:8000`. To change it:
 
```bash
# Create a .env file (or set environment variable)
cp .env.example .env
# Edit STREAMLIT_BACKEND_URL in .env
```
 
Or set the variable inline:
 
```bash
set STREAMLIT_BACKEND_URL=http://127.0.0.1:8000    # Windows
export STREAMLIT_BACKEND_URL=http://127.0.0.1:8000  # Linux/macOS
```

### 5. Start the Existing Backend

Follow the main project's instructions to start the FastAPI backend. Typically:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 6. Launch the Streamlit Dashboard

From the **repository root**:

```bash
streamlit run frontend/streamlit_dashboard/app.py --server.port 8501
```

Or from inside the `frontend/streamlit_dashboard/` directory:

```bash
streamlit run app.py --server.port 8501
```

### 7. Open in Browser

| Application | URL |
|-------------|-----|
| React Frontend | http://localhost:5173 |
| FastAPI Docs | http://localhost:8000/docs |
| **Streamlit Dashboard** | **http://localhost:8501** |

Both the React frontend and the Streamlit dashboard can run simultaneously without conflicting.

---

## Dashboard Sections

| Section | Description | Backend Endpoint(s) |
|---------|-------------|---------------------|
| **🏠 Overview** | KPIs, India map, top cities, weather summary | `/api/india/overview` |
| **🗺️ Weather Map** | Interactive geospatial map with metric layers | `/api/india/overview` |
| **🌧️ Rainfall Analytics** | Precipitation analysis, monitoring flags | `/api/india/overview` |
| **⚠️ Extreme Weather** | Heat, cold, rain, wind, humidity screening | `/api/india/overview` |
| **🏙️ City Explorer** | State comparison, historical overlay | `/api/india/overview`, `/api/weather/historical` |
| **📈 Historical Trends** | Time-series charts, statistics | `/api/weather/historical` |
| **🔍 Location Search** | City search, full weather details, forecast | `/api/geocode`, `/api/weather/dashboard` |
| **🔧 Pipeline Health** | API status, Cassandra data, architecture | `/api/health`, `/api/cassandra/cities`, `/api/cassandra/latest` |

---

## Backend Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/india/overview` | State-level current weather for all India |
| `GET /api/india/states` | List of state codes and names |
| `GET /api/india/state/{code}` | Single state weather |
| `GET /api/weather/current?lat=&lon=` | Current weather for coordinates |
| `GET /api/weather/forecast?lat=&lon=` | Hourly + daily forecast |
| `GET /api/weather/historical?lat=&lon=&days=` | Historical trends |
| `GET /api/weather/alerts?lat=&lon=` | Weather alerts (threshold-based) |
| `GET /api/weather/dashboard?lat=&lon=&name=` | Composite dashboard data |
| `GET /api/geocode?q=&limit=&country=` | Location search |
| `GET /api/health` | Backend service health |
| `GET /api/cassandra/cities` | Cities with pipeline data |
| `GET /api/cassandra/latest?city=` | Latest Cassandra record |
| `GET /api/cassandra/historical?city=&days=` | Cassandra historical data |

---

## Screening Thresholds

The Extreme Weather page uses **dashboard-calculated** screening flags with configurable thresholds:

| Hazard | Moderate | High | Unit |
|--------|----------|------|------|
| Heat | 35 | 40 | °C |
| Cold | 5 | 0 | °C |
| Rain | 25 | 50 | mm |
| Wind | 60 | 90 | km/h |
| Humidity | 85 | 90 | % |

> **Important:** These are screening indicators, not official weather warnings. They are calculated locally and should not be used as emergency alerts.

Thresholds can be adjusted in the sidebar under **⚙️ Screening Thresholds**.

---

## Running Inside Docker (Future)

If you containerise this app, set `STREAMLIT_BACKEND_URL` to the Docker network address of the FastAPI service. For example, if the backend container is named `backend`:

```
STREAMLIT_BACKEND_URL=http://backend:8000
```

**No changes** to the existing `docker-compose.yml` are made. You would add a new service block in a separate compose file or extend the existing one.

---

## Running Tests

```bash
cd frontend/streamlit_dashboard
python -m pytest tests/ -v
```

---

## Limitations & Known Constraints

1. **No Kafka/Spark/Airflow monitoring** — The current backend does not expose Kafka consumer lag, Spark throughput, or Airflow DAG status. The Pipeline Health page documents this.
2. **District-level data** — The `/india/state/{code}/districts` endpoint returns an empty list. District-level maps are not available.
3. **Map is point-based** — Weather data comes from state centre points, not continuous measurements. The map does not interpolate or create a continuous surface.
4. **Cassandra depends on pipeline** — If Kafka → Spark → Cassandra pipeline has not run, Cassandra endpoints return no data.
5. **Cache TTL** — Data is cached for 60 seconds by default. Use the **🔄 Refresh Data** button in the sidebar to force a fresh fetch.

---

## File Structure

```
frontend/streamlit_dashboard/
├── app.py                 # Main dashboard + navigation
├── api_client.py          # HTTP requests to FastAPI backend
├── data_processing.py     # DataFrame transformations & analytics
├── components.py          # Reusable UI components
├── charts.py              # Plotly & PyDeck visualizations
├── styles.py              # Design system & CSS
├── requirements.txt       # Python dependencies
├── .env.example           # Example configuration
├── README.md              # This file
└── tests/
    ├── __init__.py
    └── test_data_processing.py
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Backend unreachable" | Start the FastAPI backend on port 8000 |
| Blank map | Backend may be slow; wait and refresh |
| No Cassandra data | Pipeline hasn't run; only Open-Meteo data is available |
| Import errors | Ensure you're in the correct virtual environment |
| Port conflict | Change `--server.port` to another port |

---

*WeatherPulse — Cloud Computing & Big Data Analytics Project*
