import httpx
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.config import settings
from app.models.weather import (
    CurrentWeather, HourlyForecast, DailyForecast, WeatherAlert,
    WeatherTrends, HistoricalDataPoint, GeocodeResult, WeatherSource,
    AlertSeverity, AlertType
)

logger = logging.getLogger(__name__)

class OpenMeteoClient:
    def __init__(self):
        self.base_url = settings.open_meteo_base_url
        self.geocoding_url = settings.open_meteo_geocoding_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    # Geocoding
    async def geocode(self, query: str, limit: int = 10, country: str = "IN") -> List[GeocodeResult]:
        """Search for locations using Open-Meteo geocoding API"""
        params = {
            "name": query,
            "count": limit,
            "language": "en",
            "format": "json",
            "country": country,
        }
        try:
            response = await self.client.get(f"{self.geocoding_url}/search", params=params)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            return [GeocodeResult(**r) for r in results]
        except Exception as e:
            logger.error(f"Geocoding error for '{query}': {e}")
            return []

    async def reverse_geocode(self, lat: float, lon: float, limit: int = 1) -> List[GeocodeResult]:
        """Reverse geocode coordinates to location name"""
        params = {
            "latitude": lat,
            "longitude": lon,
            "count": limit,
            "language": "en",
            "format": "json",
        }
        try:
            response = await self.client.get(f"{self.geocoding_url}/search", params=params)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            return [GeocodeResult(**r) for r in results]
        except Exception as e:
            logger.error(f"Reverse geocoding error for ({lat}, {lon}): {e}")
            return []

    # Current Weather
    async def get_current_weather(self, lat: float, lon: float) -> CurrentWeather:
        """Get current weather from Open-Meteo"""
        params = {
            "latitude": lat,
            "longitude": lon,
            # `current_weather` is a legacy, limited response.  Request all of
            # the current fields used by CurrentWeather explicitly so that the
            # response contract and parser remain aligned.
            "current": (
                "temperature_2m,relative_humidity_2m,apparent_temperature,"
                "precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,"
                "surface_pressure,cloud_cover,is_day"
            ),
            "hourly": "visibility,uv_index",
            "timezone": "auto",
            "wind_speed_unit": "kmh",
            "precipitation_unit": "mm",
        }
        try:
            response = await self.client.get(f"{self.base_url}/forecast", params=params)
            response.raise_for_status()
            data = response.json()
            return self._parse_current_weather(data)
        except Exception as e:
            logger.error(f"Current weather error for ({lat}, {lon}): {e}")
            raise

    def _parse_current_weather(self, data: Dict[str, Any]) -> CurrentWeather:
        cw = data.get("current")
        if not isinstance(cw, dict):
            raise ValueError("Open-Meteo response did not include a current-weather object")

        required = (
            "time", "temperature_2m", "relative_humidity_2m", "apparent_temperature",
            "precipitation", "weather_code", "wind_speed_10m", "wind_gusts_10m", "wind_direction_10m",
            "surface_pressure", "cloud_cover", "is_day",
        )
        missing = [field for field in required if cw.get(field) is None]
        if missing:
            raise ValueError(f"Open-Meteo current-weather response is missing: {', '.join(missing)}")

        current_time = cw["time"]
        weather_code = cw["weather_code"]
        hourly = data.get("hourly") or {}
        try:
            time_index = hourly.get("time", []).index(current_time)
        except ValueError:
            # Never attach a value from a different hour to this observation.
            time_index = None

        def hourly_value(name: str) -> Optional[float]:
            values = hourly.get(name, [])
            if time_index is None or time_index >= len(values):
                return None
            return values[time_index]

        return CurrentWeather(
            temperature=cw["temperature_2m"],
            feels_like=cw["apparent_temperature"],
            humidity=cw["relative_humidity_2m"],
            wind_speed=cw["wind_speed_10m"],
            wind_gust=cw["wind_gusts_10m"],
            wind_direction=cw["wind_direction_10m"],
            wind_direction_text=self._get_wind_direction_text(cw["wind_direction_10m"]),
            precipitation=cw["precipitation"],
            pressure=cw["surface_pressure"],
            weather_code=weather_code,
            weather_description=self._get_weather_description(weather_code),
            is_day=bool(cw["is_day"]),
            time=datetime.fromisoformat(current_time.replace("Z", "+00:00")),
            source=WeatherSource.OPEN_METEO,
            visibility=(hourly_value("visibility") / 1000) if hourly_value("visibility") is not None else None,
            cloud_cover=cw["cloud_cover"],
            uv_index=hourly_value("uv_index"),
        )

    # Forecast
    async def get_forecast(self, lat: float, lon: float, hours: int = 48, days: int = 7) -> tuple[List[HourlyForecast], List[DailyForecast]]:
        """Get hourly and daily forecast"""
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,cloud_cover,visibility,uv_index",
            "daily": "temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset",
            "timezone": "auto",
            "forecast_hours": hours,
            "forecast_days": days,
        }
        try:
            response = await self.client.get(f"{self.base_url}/forecast", params=params)
            response.raise_for_status()
            data = response.json()
            return self._parse_forecast(data)
        except Exception as e:
            logger.error(f"Forecast error for ({lat}, {lon}): {e}")
            raise

    def _parse_forecast(self, data: Dict[str, Any]) -> tuple[List[HourlyForecast], List[DailyForecast]]:
        hourly = data.get("hourly", {})
        daily = data.get("daily", {})

        hourly_forecasts = []
        if "time" in hourly:
            for i, time_str in enumerate(hourly["time"]):
                weather_code = hourly.get("weather_code", [0])[i]
                hourly_forecasts.append(HourlyForecast(
                    time=datetime.fromisoformat(time_str.replace("Z", "+00:00")),
                    temperature=hourly.get("temperature_2m", [0])[i],
                    feels_like=hourly.get("apparent_temperature", [0])[i],
                    humidity=hourly.get("relative_humidity_2m", [50])[i],
                    wind_speed=hourly.get("wind_speed_10m", [0])[i],
                    wind_direction=hourly.get("wind_direction_10m", [0])[i],
                    wind_direction_text=self._get_wind_direction_text(hourly.get("wind_direction_10m", [0])[i]),
                    precipitation=hourly.get("precipitation", [0])[i],
                    precipitation_probability=hourly.get("precipitation_probability", [0])[i],
                    weather_code=weather_code,
                    weather_description=self._get_weather_description(weather_code),
                    pressure=hourly.get("surface_pressure", [1013])[i],
                    cloud_cover=hourly.get("cloud_cover", [0])[i],
                    visibility=hourly.get("visibility", [10000])[i] / 1000,
                    uv_index=hourly.get("uv_index", [0])[i],
                ))

        daily_forecasts = []
        if "time" in daily:
            for i, date_str in enumerate(daily["time"]):
                weather_code = daily.get("weather_code", [0])[i]
                daily_forecasts.append(DailyForecast(
                    date=datetime.fromisoformat(date_str),
                    temperature_max=daily.get("temperature_2m_max", [0])[i],
                    temperature_min=daily.get("temperature_2m_min", [0])[i],
                    feels_like_max=daily.get("apparent_temperature_max", [0])[i],
                    feels_like_min=daily.get("apparent_temperature_min", [0])[i],
                    humidity=60,  # Daily avg not directly available
                    wind_speed_max=daily.get("wind_speed_10m_max", [0])[i],
                    wind_direction_dominant=daily.get("wind_direction_10m_dominant", [0])[i],
                    wind_direction_text=self._get_wind_direction_text(daily.get("wind_direction_10m_dominant", [0])[i]),
                    precipitation_sum=daily.get("precipitation_sum", [0])[i],
                    precipitation_probability_max=daily.get("precipitation_probability_max", [0])[i],
                    weather_code=weather_code,
                    weather_description=self._get_weather_description(weather_code),
                    pressure=1013,  # Daily pressure not directly available
                    uv_index_max=daily.get("uv_index_max", [0])[i],
                    sunrise=datetime.fromisoformat(daily.get("sunrise", [datetime.now().isoformat()])[i].replace("Z", "+00:00")),
                    sunset=datetime.fromisoformat(daily.get("sunset", [datetime.now().isoformat()])[i].replace("Z", "+00:00")),
                ))

        return hourly_forecasts, daily_forecasts

    # Historical
    async def get_historical(self, lat: float, lon: float, days: int = 30) -> WeatherTrends:
        """Get historical weather data using past_days parameter"""
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,surface_pressure",
            "past_days": min(days, 92),  # Open-Meteo supports up to 92 days
            "timezone": "auto",
        }
        try:
            response = await self.client.get(f"{self.base_url}/forecast", params=params)
            response.raise_for_status()
            data = response.json()
            return self._parse_historical(data, lat, lon, days)
        except Exception as e:
            logger.error(f"Historical weather error for ({lat}, {lon}): {e}")
            raise

    def _parse_historical(self, data: Dict[str, Any], lat: float, lon: float, days: int) -> WeatherTrends:
        hourly = data.get("hourly", {})
        temp_data = []
        precip_data = []
        humidity_data = []

        if "time" in hourly:
            for i, time_str in enumerate(hourly["time"]):
                timestamp = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                temp_data.append(HistoricalDataPoint(
                    timestamp=timestamp,
                    temperature=hourly.get("temperature_2m", [0])[i],
                    humidity=hourly.get("relative_humidity_2m", [50])[i],
                    pressure=hourly.get("surface_pressure", [1013])[i],
                    wind_speed=hourly.get("wind_speed_10m", [0])[i],
                    precipitation=hourly.get("precipitation", [0])[i],
                    source=WeatherSource.OPEN_METEO,
                ))
                precip_data.append(HistoricalDataPoint(
                    timestamp=timestamp,
                    temperature=0,
                    humidity=0,
                    pressure=0,
                    wind_speed=0,
                    precipitation=hourly.get("precipitation", [0])[i],
                    source=WeatherSource.OPEN_METEO,
                ))
                humidity_data.append(HistoricalDataPoint(
                    timestamp=timestamp,
                    temperature=0,
                    humidity=hourly.get("relative_humidity_2m", [50])[i],
                    pressure=0,
                    wind_speed=0,
                    precipitation=0,
                    source=WeatherSource.OPEN_METEO,
                ))

        temps = [d.temperature for d in temp_data]
        precips = [d.precipitation for d in precip_data]
        humidities = [d.humidity for d in humidity_data]

        return WeatherTrends(
            location={"lat": lat, "lon": lon},
            location_name="Selected Location",
            period=f"{days}d",
            temperature={
                "min": min(temps) if temps else 0,
                "max": max(temps) if temps else 0,
                "avg": sum(temps) / len(temps) if temps else 0,
                "data": temp_data,
            },
            precipitation={
                "total": sum(precips),
                "avg": sum(precips) / len(precips) if precips else 0,
                "data": precip_data,
            },
            humidity={
                "avg": sum(humidities) / len(humidities) if humidities else 0,
                "data": humidity_data,
            },
        )

    # Alerts - Generate based on thresholds
    async def get_alerts(self, lat: float, lon: float, current: CurrentWeather, daily: List[DailyForecast]) -> List[WeatherAlert]:
        """Generate alerts based on weather conditions"""
        alerts = []
        alert_id = 0

        # Temperature alerts
        if current.temperature >= 40:
            alerts.append(WeatherAlert(
                id=f"temp_high_{alert_id}",
                type=AlertType.TEMPERATURE,
                severity=AlertSeverity.EXTREME if current.temperature >= 45 else AlertSeverity.SEVERE,
                title="Extreme Heat Warning" if current.temperature >= 45 else "Heat Warning",
                description=f"Temperature is {current.temperature}°C. Risk of heat-related illness.",
                threshold=40,
                current_value=current.temperature,
                unit="°C",
                start_time=current.time,
            ))
            alert_id += 1
        elif current.temperature <= 0:
            alerts.append(WeatherAlert(
                id=f"temp_low_{alert_id}",
                type=AlertType.TEMPERATURE,
                severity=AlertSeverity.SEVERE if current.temperature <= -10 else AlertSeverity.WARNING,
                title="Freezing Warning" if current.temperature <= -10 else "Frost Advisory",
                description=f"Temperature is {current.temperature}°C. Risk of frost/freezing.",
                threshold=0,
                current_value=current.temperature,
                unit="°C",
                start_time=current.time,
            ))
            alert_id += 1

        # Precipitation alerts
        if current.precipitation >= 50:
            alerts.append(WeatherAlert(
                id=f"precip_high_{alert_id}",
                type=AlertType.PRECIPITATION,
                severity=AlertSeverity.EXTREME if current.precipitation >= 100 else AlertSeverity.SEVERE,
                title="Extreme Rainfall Warning" if current.precipitation >= 100 else "Heavy Rain Warning",
                description=f"Current precipitation: {current.precipitation}mm. Risk of flooding.",
                threshold=50,
                current_value=current.precipitation,
                unit="mm",
                start_time=current.time,
            ))
            alert_id += 1

        # Wind alerts
        if current.wind_speed >= 60:
            alerts.append(WeatherAlert(
                id=f"wind_high_{alert_id}",
                type=AlertType.WIND,
                severity=AlertSeverity.SEVERE if current.wind_speed >= 90 else AlertSeverity.WARNING,
                title="High Wind Warning" if current.wind_speed >= 90 else "Windy Conditions",
                description=f"Wind speed: {current.wind_speed} km/h. Secure loose objects.",
                threshold=60,
                current_value=current.wind_speed,
                unit="km/h",
                start_time=current.time,
            ))
            alert_id += 1

        # UV alerts
        if current.uv_index and current.uv_index >= 8:
            alerts.append(WeatherAlert(
                id=f"uv_high_{alert_id}",
                type=AlertType.UV,
                severity=AlertSeverity.SEVERE if current.uv_index >= 11 else AlertSeverity.WARNING,
                title="Extreme UV Index" if current.uv_index >= 11 else "High UV Index",
                description=f"UV Index: {current.uv_index}. Use sun protection.",
                threshold=8,
                current_value=current.uv_index,
                unit="",
                start_time=current.time,
            ))
            alert_id += 1

        # Forecast-based alerts
        for day in daily[:3]:  # Check next 3 days
            if day.precipitation_sum >= 50:
                alerts.append(WeatherAlert(
                    id=f"forecast_rain_{alert_id}",
                    type=AlertType.PRECIPITATION,
                    severity=AlertSeverity.WARNING,
                    title="Heavy Rain Expected",
                    description=f"Heavy rain ({day.precipitation_sum:.1f}mm) expected on {day.date.strftime('%A, %b %d')}.",
                    threshold=50,
                    current_value=day.precipitation_sum,
                    unit="mm",
                    start_time=day.date,
                    end_time=day.date + timedelta(days=1),
                ))
                alert_id += 1
            if day.temperature_max >= 40:
                alerts.append(WeatherAlert(
                    id=f"forecast_heat_{alert_id}",
                    type=AlertType.TEMPERATURE,
                    severity=AlertSeverity.WARNING,
                    title="Heat Wave Expected",
                    description=f"High temperature ({day.temperature_max:.1f}°C) expected on {day.date.strftime('%A, %b %d')}.",
                    threshold=40,
                    current_value=day.temperature_max,
                    unit="°C",
                    start_time=day.date,
                    end_time=day.date + timedelta(days=1),
                ))
                alert_id += 1

        return alerts

    # Helper methods
    def _calculate_feels_like(self, temp: float, humidity: int, wind_speed: float) -> float:
        """Calculate feels-like temperature (heat index / wind chill)"""
        if temp >= 27:  # Heat index
            hi = -8.784695 + 1.61139411 * temp + 2.338549 * humidity - 0.14611605 * temp * humidity \
                 - 0.012308094 * temp**2 - 0.016424828 * humidity**2 + 0.002211732 * temp**2 * humidity \
                 + 0.00072546 * temp * humidity**2 - 0.000003582 * temp**2 * humidity**2
            return round(hi, 1)
        elif temp <= 10 and wind_speed > 4.8:  # Wind chill
            wc = 13.12 + 0.6215 * temp - 11.37 * (wind_speed ** 0.16) + 0.3965 * temp * (wind_speed ** 0.16)
            return round(wc, 1)
        return temp

    def _get_weather_description(self, code: int) -> str:
        descriptions = {
            0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
            45: "Fog", 48: "Depositing rime fog",
            51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
            56: "Light freezing drizzle", 57: "Dense freezing drizzle",
            61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
            66: "Light freezing rain", 67: "Heavy freezing rain",
            71: "Slight snow fall", 73: "Moderate snow fall", 75: "Heavy snow fall",
            77: "Snow grains",
            80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
            85: "Slight snow showers", 86: "Heavy snow showers",
            95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
        }
        return descriptions.get(code, "Unknown")

    def _get_wind_direction_text(self, degrees: float) -> str:
        directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
        index = round(degrees / 22.5) % 16
        return directions[index]

    def _is_daytime(self, iso_time: str) -> bool:
        dt = datetime.fromisoformat(iso_time.replace("Z", "+00:00"))
        return 6 <= dt.hour < 18

# Singleton instance
_open_meteo_client: Optional[OpenMeteoClient] = None

async def get_open_meteo_client() -> OpenMeteoClient:
    global _open_meteo_client
    if _open_meteo_client is None:
        _open_meteo_client = OpenMeteoClient()
    return _open_meteo_client

async def close_open_meteo_client():
    global _open_meteo_client
    if _open_meteo_client:
        await _open_meteo_client.close()
        _open_meteo_client = None
