from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class WeatherSource(str, Enum):
    OPEN_METEO = "open-meteo"
    CASSANDRA = "cassandra"
    MIXED = "mixed"

class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    SEVERE = "severe"
    EXTREME = "extreme"

class AlertType(str, Enum):
    TEMPERATURE = "temperature"
    PRECIPITATION = "precipitation"
    WIND = "wind"
    PRESSURE = "pressure"
    UV = "uv"

class Coordinates(BaseModel):
    lat: float
    lon: float

class CurrentWeather(BaseModel):
    temperature: float
    feels_like: float
    humidity: int
    wind_speed: float
    wind_gust: Optional[float] = None
    wind_direction: int
    wind_direction_text: str
    precipitation: float
    pressure: float
    weather_code: int
    weather_description: str
    is_day: bool
    time: datetime
    source: WeatherSource = WeatherSource.OPEN_METEO
    visibility: Optional[float] = None
    cloud_cover: Optional[int] = None
    uv_index: Optional[float] = None

class HourlyForecast(BaseModel):
    time: datetime
    temperature: float
    feels_like: float
    humidity: int
    wind_speed: float
    wind_direction: int
    precipitation: float
    precipitation_probability: int
    weather_code: int
    weather_description: str
    pressure: float
    cloud_cover: int
    visibility: float
    uv_index: float
    wind_direction_text: str

class DailyForecast(BaseModel):
    date: datetime
    temperature_max: float
    temperature_min: float
    feels_like_max: float
    feels_like_min: float
    humidity: int
    wind_speed_max: float
    wind_direction_dominant: int
    precipitation_sum: float
    precipitation_probability_max: int
    weather_code: int
    weather_description: str
    pressure: float
    uv_index_max: float
    sunrise: datetime
    sunset: datetime
    wind_direction_text: str

class WeatherAlert(BaseModel):
    id: str
    type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    threshold: float
    current_value: float
    unit: str
    start_time: datetime
    end_time: Optional[datetime] = None
    regions: List[str] = []

class HistoricalDataPoint(BaseModel):
    timestamp: datetime
    temperature: float
    humidity: int
    pressure: float
    wind_speed: float
    precipitation: float
    source: WeatherSource

class WeatherTrends(BaseModel):
    location: Coordinates
    location_name: str
    period: str
    temperature: dict
    precipitation: dict
    humidity: dict

class WeatherDashboardData(BaseModel):
    location: Coordinates
    location_name: str
    current: Optional[CurrentWeather] = None
    hourly: List[HourlyForecast] = []
    daily: List[DailyForecast] = []
    trends: Optional[WeatherTrends] = None
    alerts: List[WeatherAlert] = []
    last_updated: datetime
    data_source: WeatherSource
    is_loading: bool = False
    error: Optional[str] = None

# Geocoding
class GeocodeResult(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    feature_code: Optional[str] = None
    country_code: Optional[str] = None
    admin1_id: Optional[int] = None
    admin2_id: Optional[int] = None
    admin3_id: Optional[int] = None
    admin4_id: Optional[int] = None
    timezone: Optional[str] = None
    population: Optional[int] = None
    postcodes: List[str] = []
    country: Optional[str] = None
    admin1: Optional[str] = None
    admin2: Optional[str] = None
    admin3: Optional[str] = None
    admin4: Optional[str] = None

class GeocodeResponse(BaseModel):
    results: List[GeocodeResult]
    generation_time: float

# India Overview
class StateWeatherSummary(BaseModel):
    code: str
    name: str
    center: Coordinates
    bounds: dict
    current: Optional[CurrentWeather] = None
    alert_level: str = "none"
    district_count: int

class IndiaOverviewResponse(BaseModel):
    states: List[StateWeatherSummary]
    national: dict
    timestamp: datetime

class DistrictWeatherSummary(BaseModel):
    code: str
    name: str
    state_code: str
    center: Coordinates
    bounds: dict
    current: Optional[CurrentWeather] = None
    alert_level: str = "none"

# Health
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    services: dict = {}
