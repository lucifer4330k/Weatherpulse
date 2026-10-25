"""
WeatherPulse Dashboard — API Client
Communicates with the existing FastAPI backend.
All endpoint paths mirror the actual registered routes.
"""

import os
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

import httpx
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_raw_backend_url = os.getenv("STREAMLIT_BACKEND_URL", "http://127.0.0.1:8000")
# On Windows, 'localhost' often resolves to IPv6 (::1) which causes connection timeouts
# when uvicorn is bound to IPv4 (127.0.0.1). Normalize localhost to 127.0.0.1 for local reliability.
if "://localhost" in _raw_backend_url:
    BACKEND_URL = _raw_backend_url.replace("://localhost", "://127.0.0.1")
else:
    BACKEND_URL = _raw_backend_url

CACHE_TTL = int(os.getenv("STREAMLIT_CACHE_TTL", "60"))
REQUEST_TIMEOUT = 15.0  # seconds


# ── Low-level helpers ──────────────────────────────────────────

def _url(path: str) -> str:
    """Build absolute URL from a path such as ``/api/india/overview``."""
    return f"{BACKEND_URL.rstrip('/')}{path}"


def _safe_get(url: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """Synchronous GET with timeout and structured error handling.

    Returns the parsed JSON **or None** on any failure.  Errors are logged
    and surfaced as Streamlit warnings only when useful.
    """
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        logger.warning("Backend unreachable at %s", BACKEND_URL)
        return None
    except httpx.TimeoutException:
        logger.warning("Request timed out: %s", url)
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning("HTTP %s from %s", exc.response.status_code, url)
        return None
    except Exception as exc:
        logger.error("Unexpected API error: %s", exc)
        return None


# ── Cached API calls ────────────────────────────────────────────
# Each function returns parsed JSON or None.  Streamlit's cache
# prevents re-fetching on every widget interaction.

@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_india_overview() -> Optional[Dict[str, Any]]:
    """GET /api/india/overview — nationwide state-level weather."""
    return _safe_get(_url("/api/india/overview"))


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_india_states() -> Optional[List[Dict[str, Any]]]:
    """GET /api/india/states — list of state codes / names."""
    return _safe_get(_url("/api/india/states"))


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_state_weather(state_code: str) -> Optional[Dict[str, Any]]:
    """GET /api/india/state/{code} — single state weather."""
    return _safe_get(_url(f"/api/india/state/{state_code}"))


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_current_weather(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """GET /api/weather/current"""
    return _safe_get(_url("/api/weather/current"), {"lat": lat, "lon": lon})


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_forecast(lat: float, lon: float, hours: int = 48, days: int = 7) -> Optional[Dict[str, Any]]:
    """GET /api/weather/forecast"""
    return _safe_get(_url("/api/weather/forecast"), {"lat": lat, "lon": lon, "hours": hours, "days": days})


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_historical(lat: float, lon: float, days: int = 30) -> Optional[Dict[str, Any]]:
    """GET /api/weather/historical"""
    return _safe_get(_url("/api/weather/historical"), {"lat": lat, "lon": lon, "days": days})


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_alerts(lat: float, lon: float) -> Optional[List[Dict[str, Any]]]:
    """GET /api/weather/alerts"""
    data = _safe_get(_url("/api/weather/alerts"), {"lat": lat, "lon": lon})
    if isinstance(data, list):
        return data
    return None


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_dashboard(lat: float, lon: float, name: str = "Selected Location") -> Optional[Dict[str, Any]]:
    """GET /api/weather/dashboard — single-call composite endpoint."""
    return _safe_get(_url("/api/weather/dashboard"), {"lat": lat, "lon": lon, "name": name})


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_geocode(query: str, limit: int = 10, country: str = "IN") -> Optional[List[Dict[str, Any]]]:
    """GET /api/geocode"""
    data = _safe_get(_url("/api/geocode"), {"q": query, "limit": limit, "country": country})
    if isinstance(data, list):
        return data
    return None


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_health() -> Optional[Dict[str, Any]]:
    """GET /api/health"""
    return _safe_get(_url("/api/health"))


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_cassandra_cities() -> Optional[Dict[str, Any]]:
    """GET /api/cassandra/cities"""
    return _safe_get(_url("/api/cassandra/cities"))


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_cassandra_latest(city: str) -> Optional[Dict[str, Any]]:
    """GET /api/cassandra/latest"""
    return _safe_get(_url("/api/cassandra/latest"), {"city": city})


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_cassandra_historical(city: str, days: int = 30) -> Optional[Dict[str, Any]]:
    """GET /api/cassandra/historical"""
    return _safe_get(_url("/api/cassandra/historical"), {"city": city, "days": days})


# ── Connection status ───────────────────────────────────────────

def check_backend_status() -> Dict[str, Any]:
    """Non-cached connectivity check; returns status dict."""
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(_url("/api/health"))
            resp.raise_for_status()
            data = resp.json()
            return {
                "online": True,
                "status": data.get("status", "unknown"),
                "services": data.get("services", {}),
                "checked_at": datetime.now(),
            }
    except Exception:
        return {
            "online": False,
            "status": "unreachable",
            "services": {},
            "checked_at": datetime.now(),
        }


def clear_all_caches():
    """Bust every Streamlit data cache so the next render fetches fresh data."""
    fetch_india_overview.clear()
    fetch_india_states.clear()
    fetch_state_weather.clear()
    fetch_current_weather.clear()
    fetch_forecast.clear()
    fetch_historical.clear()
    fetch_alerts.clear()
    fetch_dashboard.clear()
    fetch_geocode.clear()
    fetch_health.clear()
    fetch_cassandra_cities.clear()
    fetch_cassandra_latest.clear()
    fetch_cassandra_historical.clear()
