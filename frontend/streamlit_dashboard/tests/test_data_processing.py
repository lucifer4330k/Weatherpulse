"""
WeatherPulse Dashboard — Unit Tests
Tests for data processing, transformations, and API-response handling.
"""

import sys
from pathlib import Path

# Ensure the dashboard package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
import pandas as pd
from datetime import datetime


# ═══════════════════════════════════════════════════════════════
#  data_processing tests
# ═══════════════════════════════════════════════════════════════

from data_processing import (
    safe_parse_datetime, format_timestamp,
    overview_to_states_df, compute_overview_kpis,
    hourly_forecast_to_df, daily_forecast_to_df,
    trends_temperature_to_df, trends_summary,
    alerts_to_df, screen_extremes,
    validate_coordinates, weather_code_to_emoji,
    safe_round, downsample_df,
)


class TestSafeParseDatetime:
    def test_iso_string(self):
        dt = safe_parse_datetime("2024-06-15T10:30:00")
        assert isinstance(dt, datetime)
        assert dt.day == 15

    def test_iso_with_z(self):
        dt = safe_parse_datetime("2024-06-15T10:30:00Z")
        assert isinstance(dt, datetime)

    def test_none(self):
        assert safe_parse_datetime(None) is None

    def test_invalid(self):
        assert safe_parse_datetime("not-a-date") is None

    def test_datetime_passthrough(self):
        now = datetime.now()
        assert safe_parse_datetime(now) is now


class TestFormatTimestamp:
    def test_none(self):
        assert format_timestamp(None) == "—"

    def test_datetime(self):
        dt = datetime(2024, 6, 15, 10, 30)
        result = format_timestamp(dt)
        assert "15" in result
        assert "Jun" in result


class TestValidateCoordinates:
    def test_valid(self):
        assert validate_coordinates(28.6, 77.2) is True

    def test_invalid_lat(self):
        assert validate_coordinates(91, 77.2) is False

    def test_invalid_lon(self):
        assert validate_coordinates(28.6, 181) is False

    def test_none(self):
        assert validate_coordinates(None, 77.2) is False

    def test_string_numbers(self):
        assert validate_coordinates("28.6", "77.2") is True


class TestSafeRound:
    def test_normal(self):
        assert safe_round(3.14159, 2) == 3.14

    def test_none(self):
        assert safe_round(None) is None

    def test_string(self):
        assert safe_round("hello") is None


class TestWeatherCodeToEmoji:
    def test_clear(self):
        assert weather_code_to_emoji(0) == "☀️"

    def test_rain(self):
        assert weather_code_to_emoji(63) == "🌧️"

    def test_unknown(self):
        assert weather_code_to_emoji(999) == "🌡️"


# ═══════════════════════════════════════════════════════════════
#  DataFrame conversion tests
# ═══════════════════════════════════════════════════════════════

SAMPLE_OVERVIEW = {
    "states": [
        {
            "code": "DL",
            "name": "Delhi",
            "center": {"lat": 28.7041, "lon": 77.1025},
            "bounds": {},
            "current": {
                "temperature": 38.5,
                "feels_like": 42.0,
                "humidity": 55,
                "wind_speed": 12.0,
                "wind_direction": 180,
                "wind_direction_text": "S",
                "precipitation": 0.0,
                "pressure": 1005.0,
                "weather_code": 1,
                "weather_description": "Mainly clear",
                "is_day": True,
                "time": "2024-06-15T14:00:00",
                "cloud_cover": 20,
                "visibility": 10.0,
                "uv_index": 7.5,
            },
            "alert_level": "moderate",
        },
        {
            "code": "SK",
            "name": "Sikkim",
            "center": {"lat": 27.533, "lon": 88.5122},
            "bounds": {},
            "current": {
                "temperature": 18.2,
                "feels_like": 17.0,
                "humidity": 85,
                "wind_speed": 8.0,
                "wind_direction": 270,
                "wind_direction_text": "W",
                "precipitation": 5.2,
                "pressure": 1010.0,
                "weather_code": 61,
                "weather_description": "Slight rain",
                "is_day": True,
                "time": "2024-06-15T14:00:00",
                "cloud_cover": 80,
                "visibility": 5.0,
                "uv_index": 2.0,
            },
            "alert_level": "none",
        },
        {
            "code": "LA",
            "name": "Ladakh",
            "center": {"lat": 34.2996, "lon": 78.2932},
            "bounds": {},
            "current": None,  # No data
            "alert_level": "none",
        },
    ],
    "national": {"avg_temperature": 28.4, "avg_humidity": 70, "total_precipitation": 5.2, "alert_count": 1},
    "timestamp": "2024-06-15T14:05:00",
}


class TestOverviewToDF:
    def test_converts_to_dataframe(self):
        df = overview_to_states_df(SAMPLE_OVERVIEW)
        assert isinstance(df, pd.DataFrame)
        assert len(df) == 3
        assert "state_name" in df.columns
        assert "temperature" in df.columns

    def test_null_current_gives_nan(self):
        df = overview_to_states_df(SAMPLE_OVERVIEW)
        ladakh = df[df["state_code"] == "LA"]
        assert ladakh["temperature"].isna().all()

    def test_valid_values(self):
        df = overview_to_states_df(SAMPLE_OVERVIEW)
        delhi = df[df["state_code"] == "DL"]
        assert delhi["temperature"].iloc[0] == 38.5

    def test_empty_overview(self):
        df = overview_to_states_df({"states": []})
        assert len(df) == 0


class TestComputeKPIs:
    def test_normal(self):
        df = overview_to_states_df(SAMPLE_OVERVIEW)
        kpis = compute_overview_kpis(df)
        assert kpis["avg_temp"] is not None
        assert kpis["max_temp_state"] == "Delhi"
        assert kpis["min_temp_state"] == "Sikkim"
        assert kpis["reporting_states"] == 2
        assert kpis["total_states"] == 3

    def test_empty(self):
        df = pd.DataFrame(columns=["temperature", "state_name", "alert_level"])
        kpis = compute_overview_kpis(df)
        assert kpis["avg_temp"] is None
        assert kpis["reporting_states"] == 0


class TestScreenExtremes:
    def test_flags_heat(self):
        df = overview_to_states_df(SAMPLE_OVERVIEW)
        screened = screen_extremes(df, {"heat_high": 40, "heat_moderate": 35})
        delhi = screened[screened["state_code"] == "DL"]
        assert delhi["heat_flag"].iloc[0] == "moderate"  # 38.5 >= 35 but < 40

    def test_no_flag(self):
        df = overview_to_states_df(SAMPLE_OVERVIEW)
        screened = screen_extremes(df)
        sikkim = screened[screened["state_code"] == "SK"]
        assert sikkim["heat_flag"].iloc[0] == "none"


class TestHourlyForecastToDF:
    def test_empty(self):
        assert hourly_forecast_to_df([]).empty

    def test_converts(self):
        data = [
            {"time": "2024-06-15T14:00:00", "temperature": 35, "humidity": 60},
            {"time": "2024-06-15T15:00:00", "temperature": 34, "humidity": 62},
        ]
        df = hourly_forecast_to_df(data)
        assert len(df) == 2
        assert pd.api.types.is_datetime64_any_dtype(df["time"])


class TestTrendsTemperatureToDF:
    def test_empty(self):
        assert trends_temperature_to_df({}).empty

    def test_extracts(self):
        trends = {
            "temperature": {
                "min": 20, "max": 40, "avg": 30,
                "data": [
                    {"timestamp": "2024-06-14T00:00:00", "temperature": 25, "humidity": 50,
                     "pressure": 1010, "wind_speed": 5, "precipitation": 0, "source": "open-meteo"},
                ],
            },
        }
        df = trends_temperature_to_df(trends)
        assert len(df) == 1
        assert df["temperature"].iloc[0] == 25


class TestTrendsSummary:
    def test_extracts_stats(self):
        trends = {
            "temperature": {"min": 18, "max": 42, "avg": 30},
            "precipitation": {"total": 55.2, "avg": 1.8},
            "humidity": {"avg": 65},
            "period": "30d",
            "location_name": "Delhi",
        }
        s = trends_summary(trends)
        assert s["temp_avg"] == 30
        assert s["precip_total"] == 55.2
        assert s["location_name"] == "Delhi"


class TestAlertsToDF:
    def test_empty(self):
        assert alerts_to_df([]).empty

    def test_converts(self):
        alerts = [
            {
                "id": "temp_high_0",
                "type": "temperature",
                "severity": "severe",
                "title": "Heat Warning",
                "description": "Hot",
                "threshold": 40,
                "current_value": 45,
                "unit": "°C",
                "start_time": "2024-06-15T14:00:00",
            }
        ]
        df = alerts_to_df(alerts)
        assert len(df) == 1
        assert df["severity"].iloc[0] == "severe"


class TestDownsampleDF:
    def test_small_df_unchanged(self):
        df = pd.DataFrame({"timestamp": pd.date_range("2024-01-01", periods=10), "val": range(10)})
        result = downsample_df(df, "timestamp", max_points=20)
        assert len(result) == 10

    def test_large_df_reduced(self):
        df = pd.DataFrame({"timestamp": pd.date_range("2024-01-01", periods=1000, freq="h"), "val": range(1000)})
        result = downsample_df(df, "timestamp", max_points=100)
        assert len(result) <= 120  # Roughly 100 + last row


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
