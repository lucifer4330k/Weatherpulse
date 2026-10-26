from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from datetime import datetime
from app.models.weather import WeatherTrends
from app.services import get_cassandra_client, get_cache_service

router = APIRouter(prefix="/cassandra", tags=["cassandra"])

@router.get("/historical", response_model=WeatherTrends)
async def get_cassandra_historical(
    city: str = Query(..., description="City name"),
    days: int = Query(30, ge=1, le=365, description="Days of historical data"),
):
    """Get historical weather data from Cassandra for a city"""
    cache = await get_cache_service()
    
    cache_key = f"cassandra:historical:{city}:{days}"
    cached = await cache.get(cache_key)
    if cached:
        return WeatherTrends(**cached)
    
    client = await get_cassandra_client()
    try:
        trends = await client.get_historical_for_city(city, days)
        await cache.set(cache_key, trends.model_dump(), 3600)  # 1 hour cache
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cassandra query failed: {str(e)}")

@router.get("/latest")
async def get_cassandra_latest(city: str = Query(..., description="City name")):
    """Get latest weather record from Cassandra for a city"""
    client = await get_cassandra_client()
    try:
        result = await client.get_latest_for_city(city)
        if result is None:
            raise HTTPException(status_code=404, detail=f"No data found for city: {city}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cassandra query failed: {str(e)}")

@router.get("/latest/batch")
async def get_cassandra_latest_batch(
    cities: List[str] = Query(..., min_length=1, max_length=200),
):
    """Return latest rows for map markers in one browser request."""
    client = await get_cassandra_client()
    try:
        return {"observations": await client.get_latest_for_cities(cities)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cassandra batch query failed: {str(e)}")

@router.get("/cities")
async def get_cassandra_cities():
    """Get list of all cities with data in Cassandra"""
    client = await get_cassandra_client()
    try:
        cities = await client.get_all_cities()
        return {"cities": cities, "count": len(cities)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cassandra query failed: {str(e)}")
