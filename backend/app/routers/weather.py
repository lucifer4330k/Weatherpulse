from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
import logging
from app.locations import location_for_city
from app.routers.india import stored_current
from app.models.weather import (
    CurrentWeather, HourlyForecast, DailyForecast, WeatherAlert,
    WeatherDashboardData, WeatherTrends, WeatherSource
)
from app.services import get_open_meteo_client, get_cassandra_client, get_cache_service

router = APIRouter(prefix="/weather", tags=["weather"])
logger = logging.getLogger(__name__)

@router.get("/current", response_model=CurrentWeather)
async def get_current_weather(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
):
    """Get current weather conditions for coordinates"""
    client = await get_open_meteo_client()
    cache = await get_cache_service()
    
    cache_key = f"current:{lat}:{lon}"
    cached = await cache.get(cache_key)
    if cached:
        return CurrentWeather(**cached)
    
    current = await client.get_current_weather(lat, lon)
    await cache.set(cache_key, current.model_dump(), 600)  # 10 min cache
    return current

@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    hours: int = Query(48, ge=1, le=168, description="Hours of hourly forecast"),
    days: int = Query(7, ge=1, le=16, description="Days of daily forecast"),
):
    """Get hourly and daily forecast for coordinates"""
    client = await get_open_meteo_client()
    cache = await get_cache_service()
    
    cache_key = f"forecast:{lat}:{lon}:{hours}:{days}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    hourly, daily = await client.get_forecast(lat, lon, hours, days)
    result = {
        "hourly": [h.model_dump() for h in hourly],
        "daily": [d.model_dump() for d in daily],
    }
    await cache.set(cache_key, result, 1800)  # 30 min cache
    return result

@router.get("/historical", response_model=WeatherTrends)
async def get_historical_weather(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    days: int = Query(30, ge=1, le=92, description="Days of historical data"),
):
    """Get historical weather trends for coordinates"""
    client = await get_open_meteo_client()
    cache = await get_cache_service()
    
    cache_key = f"historical:{lat}:{lon}:{days}"
    cached = await cache.get(cache_key)
    if cached:
        return WeatherTrends(**cached)
    
    trends = await client.get_historical(lat, lon, days)
    await cache.set(cache_key, trends.model_dump(), 3600)  # 1 hour cache
    return trends

@router.get("/alerts", response_model=List[WeatherAlert])
async def get_weather_alerts(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
):
    """Get weather alerts for coordinates (generated from thresholds)"""
    client = await get_open_meteo_client()
    cache = await get_cache_service()
    
    cache_key = f"alerts:{lat}:{lon}"
    cached = await cache.get(cache_key)
    if cached:
        return [WeatherAlert(**a) for a in cached]
    
    # Get current weather and forecast to generate alerts
    current = await client.get_current_weather(lat, lon)
    hourly, daily = await client.get_forecast(lat, lon, 48, 7)
    alerts = await client.get_alerts(lat, lon, current, daily)
    
    result = [a.model_dump() for a in alerts]
    await cache.set(cache_key, result, 900)  # 15 min cache
    return alerts

@router.get("/dashboard", response_model=WeatherDashboardData)
async def get_dashboard_data(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
    name: str = Query("Selected Location", description="Location name"),
):
    """Get complete weather dashboard data in a single call"""
    client = await get_open_meteo_client()
    cache = await get_cache_service()
    
    location = location_for_city(name)
    cache_key = f"dashboard:{lat}:{lon}:{name.casefold()}"
    cached = await cache.get(cache_key)
    if cached:
        return WeatherDashboardData(**cached)
    
    # Monitored cities use the persisted pipeline for observations and history.
    # Forecasts remain explicitly provider sourced.
    if location:
        cassandra = await get_cassandra_client()
        record = await cassandra.get_latest_for_city(location["city"])
        current = stored_current(record) if record else None
        trends = await cassandra.get_historical_for_city(location["city"], 30)
        source = WeatherSource.CASSANDRA
        dashboard_error = None if current else "No persisted observation is available for this monitored city"
    else:
        current = await client.get_current_weather(lat, lon)
        trends = await client.get_historical(lat, lon, 30)
        source = WeatherSource.OPEN_METEO
        dashboard_error = None

    try:
        hourly, daily = await client.get_forecast(lat, lon, 48, 7)
        if location:
            source = WeatherSource.MIXED
    except Exception:
        if not location:
            raise
        logger.warning("Provider forecast unavailable for monitored city %s", name, exc_info=True)
        hourly, daily = [], []
        dashboard_error = "Open-Meteo forecast is temporarily unavailable"
    alerts = await client.get_alerts(lat, lon, current, daily) if current and daily else []
    
    dashboard = WeatherDashboardData(
        location={"lat": lat, "lon": lon},
        location_name=name,
        current=current,
        hourly=hourly,
        daily=daily,
        trends=trends,
        alerts=alerts,
        last_updated=current.time if current else datetime.now(timezone.utc),
        data_source=source,
        error=dashboard_error,
    )
    
    payload = dashboard.model_dump(mode="json")
    await cache.set(cache_key, payload, 60)
    return payload
