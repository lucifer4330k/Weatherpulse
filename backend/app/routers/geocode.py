from fastapi import APIRouter, Query, HTTPException
from typing import List
import hashlib
import logging
from app.models.weather import GeocodeResult
from app.services import get_open_meteo_client
from app.locations import nearest_monitored_locations

router = APIRouter(prefix="/geocode", tags=["geocoding"])
logger = logging.getLogger(__name__)


@router.get("", response_model=List[GeocodeResult])
async def geocode(
    q: str = Query(..., description="Search query for location", min_length=2),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
):
    """
    Search for locations using Open-Meteo geocoding API.
    Returns matching cities, towns, and locations in India.
    """
    client = await get_open_meteo_client()
    try:
        return await client.geocode(q, limit, "IN")
    except Exception as exc:
        logger.warning("Geocoding provider failed for %s", q, exc_info=True)
        raise HTTPException(status_code=502, detail="India location search is temporarily unavailable") from exc

@router.get("/reverse", response_model=List[GeocodeResult])
async def reverse_geocode(
    lat: float = Query(..., ge=6, le=38, description="Latitude in India"),
    lon: float = Query(..., ge=68, le=98, description="Longitude in India"),
    limit: int = Query(1, ge=1, le=10, description="Number of results"),
):
    """
    Find nearby configured monitoring points, within 50 km. This is not a
    full address or administrative reverse geocoder.
    """
    return [GeocodeResult(
        id=int.from_bytes(hashlib.sha256(location["id"].encode()).digest()[:4], "big"),
        name=location["city"], latitude=location["latitude"], longitude=location["longitude"],
        feature_code="WP_MONITORED_POINT", country_code="IN", country="India",
        admin1=location["state"], admin2=location.get("district"),
    ) for location in nearest_monitored_locations(lat, lon, limit)]
