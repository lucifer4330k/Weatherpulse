"""
WeatherPulse Dashboard — Data Processing & Transformation
Converts raw API responses into clean Pandas DataFrames and derived analytics.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════
#  Timestamp Helpers
# ══════════════════════════════════════════════════════════════════

def safe_parse_datetime(val: Any) -> Optional[datetime]:
    """Parse a datetime from various formats returned by the API."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass
        try:
            return pd.Timestamp(val).to_pydatetime()
        except Exception:
            pass
    return None


def format_timestamp(dt: Optional[datetime], fmt: str = "%d %b %Y, %H:%M") -> str:
    if dt is None:
        return "—"
    try:
        return dt.strftime(fmt)
    except Exception:
        return str(dt)


# ══════════════════════════════════════════════════════════════════
#  India Overview → DataFrames
# ══════════════════════════════════════════════════════════════════

def overview_to_states_df(overview: Dict[str, Any]) -> pd.DataFrame:
    """Convert the ``/india/overview`` response into a flat DataFrame of states
    with current weather.  States with ``current: null`` are included with NaN values.
    """
    rows = []
    for s in overview.get("states", []):
        cur = s.get("current") or {}
        center = s.get("center", {})
        rows.append({
            "state_code": s.get("code"),
            "state_name": s.get("name"),
            "lat": center.get("lat"),
            "lon": center.get("lon"),
            "temperature": cur.get("temperature"),
            "feels_like": cur.get("feels_like"),
            "humidity": cur.get("humidity"),
            "wind_speed": cur.get("wind_speed"),
            "wind_direction": cur.get("wind_direction"),
            "wind_direction_text": cur.get("wind_direction_text"),
            "precipitation": cur.get("precipitation"),
            "pressure": cur.get("pressure"),
            "weather_code": cur.get("weather_code"),
            "weather_description": cur.get("weather_description"),
            "cloud_cover": cur.get("cloud_cover"),
            "visibility": cur.get("visibility"),
            "uv_index": cur.get("uv_index"),
            "is_day": cur.get("is_day"),
            "observation_time": safe_parse_datetime(cur.get("time")),
            "alert_level": s.get("alert_level", "none"),
        })
    df = pd.DataFrame(rows)
    return df


def compute_overview_kpis(df: pd.DataFrame) -> Dict[str, Any]:
    """Derive KPI values from the states DataFrame."""
    valid = df.dropna(subset=["temperature"])
    if valid.empty:
        return {
            "avg_temp": None,
            "max_temp": None, "max_temp_state": None,
            "min_temp": None, "min_temp_state": None,
            "total_states": len(df),
            "reporting_states": 0,
            "total_precip": None,
            "avg_humidity": None,
            "alert_count": 0,
        }
    return {
        "avg_temp": round(valid["temperature"].mean(), 1),
        "max_temp": round(valid["temperature"].max(), 1),
        "max_temp_state": valid.loc[valid["temperature"].idxmax(), "state_name"],
        "min_temp": round(valid["temperature"].min(), 1),
        "min_temp_state": valid.loc[valid["temperature"].idxmin(), "state_name"],
        "total_states": len(df),
        "reporting_states": len(valid),
        "total_precip": round(valid["precipitation"].sum(), 1) if valid["precipitation"].notna().any() else None,
        "avg_humidity": round(valid["humidity"].mean(), 1) if valid["humidity"].notna().any() else None,
        "alert_count": int((valid["alert_level"] != "none").sum()),
    }


# ══════════════════════════════════════════════════════════════════
#  Forecast → DataFrames
# ══════════════════════════════════════════════════════════════════

def hourly_forecast_to_df(data: List[Dict[str, Any]]) -> pd.DataFrame:
    if not data:
        return pd.DataFrame()
    df = pd.DataFrame(data)
    if "time" in df.columns:
        df["time"] = pd.to_datetime(df["time"], errors="coerce", utc=True)
        df = df.sort_values("time").reset_index(drop=True)
    return df


def daily_forecast_to_df(data: List[Dict[str, Any]]) -> pd.DataFrame:
    if not data:
        return pd.DataFrame()
    df = pd.DataFrame(data)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce", utc=True)
        df = df.sort_values("date").reset_index(drop=True)
    return df


# ══════════════════════════════════════════════════════════════════
#  Historical / Trends → DataFrames
# ══════════════════════════════════════════════════════════════════

def trends_temperature_to_df(trends: Dict[str, Any]) -> pd.DataFrame:
    """Extract the ``temperature.data`` list from a WeatherTrends response."""
    data = (trends.get("temperature") or {}).get("data", [])
    return _historical_points_to_df(data)


def trends_precipitation_to_df(trends: Dict[str, Any]) -> pd.DataFrame:
    data = (trends.get("precipitation") or {}).get("data", [])
    return _historical_points_to_df(data)


def trends_humidity_to_df(trends: Dict[str, Any]) -> pd.DataFrame:
    data = (trends.get("humidity") or {}).get("data", [])
    return _historical_points_to_df(data)


def _historical_points_to_df(points: List[Dict[str, Any]]) -> pd.DataFrame:
    if not points:
        return pd.DataFrame()
    df = pd.DataFrame(points)
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        df = df.sort_values("timestamp").reset_index(drop=True)
    return df


def trends_summary(trends: Dict[str, Any]) -> Dict[str, Any]:
    """Pull out the pre-computed summary statistics from a WeatherTrends object."""
    temp = trends.get("temperature") or {}
    precip = trends.get("precipitation") or {}
    humid = trends.get("humidity") or {}
    return {
        "temp_min": temp.get("min"),
        "temp_max": temp.get("max"),
        "temp_avg": temp.get("avg"),
        "precip_total": precip.get("total"),
        "precip_avg": precip.get("avg"),
        "humidity_avg": humid.get("avg"),
        "period": trends.get("period"),
        "location_name": trends.get("location_name"),
    }


# ══════════════════════════════════════════════════════════════════
#  Alert helpers
# ══════════════════════════════════════════════════════════════════

def alerts_to_df(alerts: List[Dict[str, Any]]) -> pd.DataFrame:
    if not alerts:
        return pd.DataFrame()
    df = pd.DataFrame(alerts)
    for col in ("start_time", "end_time"):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce", utc=True)
    return df


# ══════════════════════════════════════════════════════════════════
#  Extreme-weather threshold screening
# ══════════════════════════════════════════════════════════════════

DEFAULT_THRESHOLDS = {
    "heat_high": 40.0,   # °C
    "heat_moderate": 35.0,
    "cold_moderate": 5.0,
    "cold_high": 0.0,
    "rain_high": 50.0,   # mm
    "rain_moderate": 25.0,
    "wind_high": 90.0,   # km/h
    "wind_moderate": 60.0,
    "humidity_high": 90,  # %
}


def screen_extremes(df: pd.DataFrame, thresholds: Optional[Dict[str, float]] = None) -> pd.DataFrame:
    """Add screening columns to a states DataFrame.

    Adds ``heat_flag``, ``rain_flag``, ``wind_flag``, ``humidity_flag``
    with values ``none | moderate | high``.

    These are **dashboard-calculated screening flags**, not official warnings.
    """
    t = {**DEFAULT_THRESHOLDS, **(thresholds or {})}
    out = df.copy()

    def _flag(series, high_thresh, mod_thresh, higher_is_worse=True):
        flags = pd.Series("none", index=series.index)
        if higher_is_worse:
            flags[series >= mod_thresh] = "moderate"
            flags[series >= high_thresh] = "high"
        else:
            flags[series <= mod_thresh] = "moderate"
            flags[series <= high_thresh] = "high"
        flags[series.isna()] = "none"
        return flags

    if "temperature" in out.columns:
        out["heat_flag"] = _flag(out["temperature"], t["heat_high"], t["heat_moderate"])
        out["cold_flag"] = _flag(out["temperature"], t["cold_high"], t["cold_moderate"], higher_is_worse=False)
    if "precipitation" in out.columns:
        out["rain_flag"] = _flag(out["precipitation"], t["rain_high"], t["rain_moderate"])
    if "wind_speed" in out.columns:
        out["wind_flag"] = _flag(out["wind_speed"], t["wind_high"], t["wind_moderate"])
    if "humidity" in out.columns:
        out["humidity_flag"] = _flag(out["humidity"], t["humidity_high"], t["humidity_high"] - 5)

    return out


# ══════════════════════════════════════════════════════════════════
#  Utility
# ══════════════════════════════════════════════════════════════════

def validate_coordinates(lat: Any, lon: Any) -> bool:
    try:
        lat, lon = float(lat), float(lon)
        return -90 <= lat <= 90 and -180 <= lon <= 180
    except (TypeError, ValueError):
        return False


def weather_code_to_emoji(code: int) -> str:
    mapping = {
        0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
        45: "🌫️", 48: "🌫️",
        51: "🌦️", 53: "🌦️", 55: "🌧️",
        61: "🌧️", 63: "🌧️", 65: "🌧️",
        71: "🌨️", 73: "🌨️", 75: "❄️",
        80: "🌦️", 81: "🌧️", 82: "⛈️",
        95: "⛈️", 96: "⛈️", 99: "⛈️",
    }
    return mapping.get(code, "🌡️")


def safe_round(val: Any, decimals: int = 1) -> Optional[float]:
    try:
        return round(float(val), decimals)
    except (TypeError, ValueError):
        return None


def downsample_df(df: pd.DataFrame, time_col: str, max_points: int = 500) -> pd.DataFrame:
    """Thin a time-series DataFrame to at most *max_points* rows by
    evenly-spaced sampling.  Preserves first and last rows."""
    if len(df) <= max_points:
        return df
    step = max(1, len(df) // max_points)
    sampled = df.iloc[::step]
    # Ensure the last row is present
    if sampled.index[-1] != df.index[-1]:
        sampled = pd.concat([sampled, df.iloc[[-1]]])
    return sampled.reset_index(drop=True)
