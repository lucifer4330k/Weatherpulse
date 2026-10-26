from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from datetime import datetime
from app.models.weather import (
    IndiaOverviewResponse, StateWeatherSummary, DistrictWeatherSummary,
    CurrentWeather, Coordinates, WeatherSource
)
from app.services import get_open_meteo_client, get_cache_service

router = APIRouter(prefix="/india", tags=["india"])

# State centers and codes for India
INDIAN_STATES = [
    {"code": "AN", "name": "Andaman and Nicobar Islands", "center": {"lat": 11.7401, "lon": 92.6586}},
    {"code": "AP", "name": "Andhra Pradesh", "center": {"lat": 15.9129, "lon": 79.7400}},
    {"code": "AR", "name": "Arunachal Pradesh", "center": {"lat": 28.2180, "lon": 94.7278}},
    {"code": "AS", "name": "Assam", "center": {"lat": 26.2006, "lon": 92.9376}},
    {"code": "BR", "name": "Bihar", "center": {"lat": 25.0961, "lon": 85.3131}},
    {"code": "CH", "name": "Chandigarh", "center": {"lat": 30.7333, "lon": 76.7794}},
    {"code": "CT", "name": "Chhattisgarh", "center": {"lat": 21.2787, "lon": 81.8661}},
    {"code": "DN", "name": "Dadra and Nagar Haveli", "center": {"lat": 20.3974, "lon": 72.8328}},
    {"code": "DD", "name": "Daman and Diu", "center": {"lat": 20.7602, "lon": 70.9765}},
    {"code": "DL", "name": "Delhi", "center": {"lat": 28.7041, "lon": 77.1025}},
    {"code": "GA", "name": "Goa", "center": {"lat": 15.2993, "lon": 74.1240}},
    {"code": "GJ", "name": "Gujarat", "center": {"lat": 22.2587, "lon": 71.1924}},
    {"code": "HR", "name": "Haryana", "center": {"lat": 29.0588, "lon": 76.0856}},
    {"code": "HP", "name": "Himachal Pradesh", "center": {"lat": 31.1048, "lon": 77.1734}},
    {"code": "JK", "name": "Jammu and Kashmir", "center": {"lat": 33.7782, "lon": 76.5762}},
    {"code": "JH", "name": "Jharkhand", "center": {"lat": 23.6102, "lon": 85.2799}},
    {"code": "KA", "name": "Karnataka", "center": {"lat": 15.3173, "lon": 75.7139}},
    {"code": "KL", "name": "Kerala", "center": {"lat": 10.8505, "lon": 76.2711}},
    {"code": "LA", "name": "Ladakh", "center": {"lat": 34.2996, "lon": 78.2932}},
    {"code": "LD", "name": "Lakshadweep", "center": {"lat": 10.5667, "lon": 72.6417}},
    {"code": "MP", "name": "Madhya Pradesh", "center": {"lat": 22.9734, "lon": 78.6569}},
    {"code": "MH", "name": "Maharashtra", "center": {"lat": 19.7515, "lon": 75.7139}},
    {"code": "MN", "name": "Manipur", "center": {"lat": 24.6637, "lon": 93.9063}},
    {"code": "ML", "name": "Meghalaya", "center": {"lat": 25.4670, "lon": 91.3662}},
    {"code": "MZ", "name": "Mizoram", "center": {"lat": 23.1645, "lon": 92.9376}},
    {"code": "NL", "name": "Nagaland", "center": {"lat": 26.1584, "lon": 94.5624}},
    {"code": "OR", "name": "Odisha", "center": {"lat": 20.9517, "lon": 85.0985}},
    {"code": "PB", "name": "Punjab", "center": {"lat": 31.1471, "lon": 75.3412}},
    {"code": "PY", "name": "Puducherry", "center": {"lat": 11.9416, "lon": 79.8083}},
    {"code": "RJ", "name": "Rajasthan", "center": {"lat": 27.0238, "lon": 74.2179}},
    {"code": "SK", "name": "Sikkim", "center": {"lat": 27.5330, "lon": 88.5122}},
    {"code": "TN", "name": "Tamil Nadu", "center": {"lat": 11.1271, "lon": 78.6569}},
    {"code": "TS", "name": "Telangana", "center": {"lat": 18.1124, "lon": 79.0193}},
    {"code": "TR", "name": "Tripura", "center": {"lat": 23.9408, "lon": 91.9882}},
    {"code": "UP", "name": "Uttar Pradesh", "center": {"lat": 26.8467, "lon": 80.9462}},
    {"code": "UK", "name": "Uttarakhand", "center": {"lat": 30.0668, "lon": 79.0193}},
    {"code": "WB", "name": "West Bengal", "center": {"lat": 22.9868, "lon": 87.8550}},
]

# Approximate bounds for each state
STATE_BOUNDS = {
    "AN": {"minLat": 6.5, "maxLat": 14.5, "minLon": 92.2, "maxLon": 94.0},
    "AP": {"minLat": 12.6, "maxLat": 19.9, "minLon": 76.8, "maxLon": 84.8},
    "AR": {"minLat": 26.3, "maxLat": 29.5, "minLon": 91.3, "maxLon": 97.5},
    "AS": {"minLat": 24.1, "maxLat": 28.0, "minLon": 89.7, "maxLon": 96.0},
    "BR": {"minLat": 24.3, "maxLat": 27.5, "minLon": 83.3, "maxLon": 88.3},
    "CH": {"minLat": 30.6, "maxLat": 30.8, "minLon": 76.6, "maxLon": 76.9},
    "CT": {"minLat": 17.8, "maxLat": 24.1, "minLon": 80.2, "maxLon": 84.4},
    "DN": {"minLat": 20.1, "maxLat": 20.5, "minLon": 72.8, "maxLon": 73.2},
    "DD": {"minLat": 20.7, "maxLat": 20.9, "minLon": 70.9, "maxLon": 71.0},
    "DL": {"minLat": 28.4, "maxLat": 28.9, "minLon": 76.8, "maxLon": 77.3},
    "GA": {"minLat": 14.9, "maxLat": 15.8, "minLon": 73.7, "maxLon": 74.3},
    "GJ": {"minLat": 20.1, "maxLat": 24.7, "minLon": 68.2, "maxLon": 74.5},
    "HR": {"minLat": 27.6, "maxLat": 30.9, "minLon": 74.5, "maxLon": 77.6},
    "HP": {"minLat": 30.4, "maxLat": 33.3, "minLon": 75.6, "maxLon": 79.1},
    "JK": {"minLat": 32.2, "maxLat": 37.1, "minLon": 72.6, "maxLon": 80.3},
    "JH": {"minLat": 21.9, "maxLat": 25.4, "minLon": 83.3, "maxLon": 87.9},
    "KA": {"minLat": 11.5, "maxLat": 18.5, "minLon": 74.0, "maxLon": 78.5},
    "KL": {"minLat": 8.2, "maxLat": 12.8, "minLon": 74.8, "maxLon": 77.4},
    "LA": {"minLat": 32.2, "maxLat": 33.3, "minLon": 76.6, "maxLon": 79.1},
    "LD": {"minLat": 8.2, "maxLat": 12.3, "minLon": 71.5, "maxLon": 74.0},
    "MP": {"minLat": 21.1, "maxLat": 26.9, "minLon": 74.0, "maxLon": 82.8},
    "MH": {"minLat": 15.6, "maxLat": 22.1, "minLon": 72.6, "maxLon": 80.9},
    "MN": {"minLat": 23.8, "maxLat": 25.7, "minLon": 93.0, "maxLon": 94.8},
    "ML": {"minLat": 25.0, "maxLat": 26.1, "minLon": 89.7, "maxLon": 92.9},
    "MZ": {"minLat": 21.9, "maxLat": 24.5, "minLon": 92.2, "maxLon": 93.5},
    "NL": {"minLat": 25.2, "maxLat": 27.0, "minLon": 93.2, "maxLon": 95.2},
    "OR": {"minLat": 17.8, "maxLat": 22.6, "minLon": 81.3, "maxLon": 87.5},
    "PB": {"minLat": 29.5, "maxLat": 32.5, "minLon": 73.9, "maxLon": 76.9},
    "PY": {"minLat": 10.9, "maxLat": 12.0, "minLon": 79.6, "maxLon": 79.9},
    "RJ": {"minLat": 23.0, "maxLat": 30.2, "minLon": 69.5, "maxLon": 78.2},
    "SK": {"minLat": 27.0, "maxLat": 28.1, "minLon": 88.0, "maxLon": 88.9},
    "TN": {"minLat": 8.0, "maxLat": 13.5, "minLon": 76.2, "maxLon": 80.3},
    "TS": {"minLat": 15.8, "maxLat": 19.9, "minLon": 77.2, "maxLon": 81.8},
    "TR": {"minLat": 22.9, "maxLat": 24.5, "minLon": 91.1, "maxLon": 92.4},
    "UP": {"minLat": 23.9, "maxLat": 30.4, "minLon": 77.0, "maxLon": 84.6},
    "UK": {"minLat": 28.4, "maxLat": 31.4, "minLon": 77.5, "maxLon": 81.1},
    "WB": {"minLat": 21.5, "maxLat": 27.2, "minLon": 85.8, "maxLon": 89.8},
}

async def fetch_state_weather(state: dict) -> StateWeatherSummary:
    """Fetch current weather for a state's center point"""
    client = await get_open_meteo_client()
    try:
        current = await client.get_current_weather(state["center"]["lat"], state["center"]["lon"])
        
        # Determine alert level based on current conditions
        alert_level = "none"
        if current.temperature >= 45 or current.precipitation >= 100:
            alert_level = "extreme"
        elif current.temperature >= 40 or current.precipitation >= 50 or current.wind_speed >= 90:
            alert_level = "high"
        elif current.temperature >= 35 or current.precipitation >= 25 or current.wind_speed >= 60:
            alert_level = "moderate"
        elif current.temperature >= 30 or current.precipitation >= 10 or current.wind_speed >= 30:
            alert_level = "low"
        
        return StateWeatherSummary(
            code=state["code"],
            name=state["name"],
            center=Coordinates(**state["center"]),
            bounds=STATE_BOUNDS.get(state["code"], {}),
            current=current,
            alert_level=alert_level,
            district_count=0,  # Would need district data
        )
    except Exception as e:
        # Return state without weather data on error
        return StateWeatherSummary(
            code=state["code"],
            name=state["name"],
            center=Coordinates(**state["center"]),
            bounds=STATE_BOUNDS.get(state["code"], {}),
            current=None,
            alert_level="none",
            district_count=0,
        )

@router.get("/overview", response_model=IndiaOverviewResponse)
async def get_india_overview():
    """Get nationwide weather overview with all states"""
    cache = await get_cache_service()
    
    cache_key = "india:overview"
    cached = await cache.get(cache_key)
    if cached:
        cached["timestamp"] = datetime.now().isoformat()
        return IndiaOverviewResponse(**cached)
    
    # Fetch weather for all states in parallel
    import asyncio
    state_weathers = await asyncio.gather(*[
        fetch_state_weather(state) for state in INDIAN_STATES
    ])
    
    # Calculate national averages
    valid_states = [s for s in state_weathers if s.current is not None]
    avg_temp = sum(s.current.temperature for s in valid_states) / len(valid_states) if valid_states else 0
    avg_humidity = sum(s.current.humidity for s in valid_states) / len(valid_states) if valid_states else 0
    total_precip = sum(s.current.precipitation for s in valid_states)
    alert_count = sum(1 for s in state_weathers if s.alert_level != "none")
    
    overview = IndiaOverviewResponse(
        states=state_weathers,
        national={
            "avg_temperature": round(avg_temp, 1),
            "avg_humidity": round(avg_humidity, 1),
            "total_precipitation": round(total_precip, 1),
            "alert_count": alert_count,
        },
        timestamp=datetime.now(),
    )
    
    await cache.set(cache_key, overview.model_dump(), 300)  # 5 min cache
    return overview

@router.get("/state/{state_code}", response_model=StateWeatherSummary)
async def get_state_weather(state_code: str):
    """Get detailed weather for a specific state"""
    state_code = state_code.upper()
    state = next((s for s in INDIAN_STATES if s["code"] == state_code), None)
    if not state:
        raise HTTPException(status_code=404, detail=f"State {state_code} not found")
    
    return await fetch_state_weather(state)

@router.get("/state/{state_code}/districts", response_model=List[DistrictWeatherSummary])
async def get_state_districts(state_code: str):
    """Get district-level weather for a state"""
    state_code = state_code.upper()
    state = next((s for s in INDIAN_STATES if s["code"] == state_code), None)
    if not state:
        raise HTTPException(status_code=404, detail=f"State {state_code} not found")
    
    # Load district data from GeoJSON
    import json
    import os
    district_geojson_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "geojson", "india-districts.geojson")
    
    if not os.path.exists(district_geojson_path):
        # Return empty list if district data not available
        return []
    
    with open(district_geojson_path, 'r') as f:
        district_data = json.load(f)
    
    # Filter districts for this state
    state_districts = [
        d for d in district_data.get("features", []) 
        if d.get("properties", {}).get("state_code") == state_code
    ]
    
    if not state_districts:
        return []
    
    # Fetch weather for each district
    client = await get_open_meteo_client()
    district_summaries = []
    
    for district in state_districts:
        props = district.get("properties", {})
        geometry = district.get("geometry", {})
        
        if not geometry or geometry.get("type") != "Polygon":
            continue
            
        # Calculate district center from polygon bounds
        coords = geometry.get("coordinates", [[]])[0]
        if not coords:
            continue
            
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        center_lon = sum(lons) / len(lons)
        center_lat = sum(lats) / len(lats)
        
        try:
            current = await client.get_current_weather(center_lat, center_lon)
            
            # Determine alert level
            alert_level = "none"
            if current.temperature >= 45 or current.precipitation >= 100:
                alert_level = "extreme"
            elif current.temperature >= 40 or current.precipitation >= 50 or current.wind_speed >= 90:
                alert_level = "high"
            elif current.temperature >= 35 or current.precipitation >= 25 or current.wind_speed >= 60:
                alert_level = "moderate"
            elif current.temperature >= 30 or current.precipitation >= 10 or current.wind_speed >= 30:
                alert_level = "low"
            
            district_summaries.append(DistrictWeatherSummary(
                code=props.get("code", ""),
                name=props.get("name", ""),
                state_code=state_code,
                center=Coordinates(lat=center_lat, lon=center_lon),
                bounds={},  # Could compute from geometry
                current=current,
                alert_level=alert_level,
            ))
        except Exception as e:
            logger.warning(f"Failed to fetch weather for district {props.get('name', 'unknown')}: {e}")
            # Add district without weather data
            district_summaries.append(DistrictWeatherSummary(
                code=props.get("code", ""),
                name=props.get("name", ""),
                state_code=state_code,
                center=Coordinates(lat=center_lat, lon=center_lon),
                bounds={},
                current=None,
                alert_level="none",
            ))
    
    return district_summaries

@router.get("/states", response_model=List[dict])
async def list_states():
    """List all Indian states with codes"""
    return [{"code": s["code"], "name": s["name"]} for s in INDIAN_STATES]