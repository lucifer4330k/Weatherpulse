from fastapi import APIRouter
from datetime import datetime
from app.models.weather import HealthResponse
import asyncio

router = APIRouter(prefix="", tags=["health"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for monitoring - non-blocking"""
    from app.services import get_open_meteo_client, get_cassandra_client, get_cache_service
    from app.config import settings
    
    services = {}
    
    # Check Open-Meteo (with short timeout)
    try:
        client = await get_open_meteo_client()
        await asyncio.wait_for(client.geocode("Delhi", limit=1), timeout=5.0)
        services["open_meteo"] = "healthy"
    except Exception as e:
        services["open_meteo"] = f"unhealthy: {str(e)}"
    
    # Verify a real Cassandra round trip; object construction alone is not a
    # dependency health check.
    try:
        cassandra = await asyncio.wait_for(get_cassandra_client(), timeout=5.0)
        await asyncio.wait_for(asyncio.to_thread(cassandra.session.execute, "SELECT release_version FROM system.local"), timeout=5.0)
        services["cassandra"] = "healthy"
    except Exception as e:
        services["cassandra"] = f"unhealthy: {str(e)}"
    
    # Redis may intentionally fall back to local cache, but a configured Redis
    # connection is only healthy after it responds to PING.
    try:
        cache = await asyncio.wait_for(get_cache_service(), timeout=5.0)
        if cache.use_redis and cache.redis_client:
            await asyncio.wait_for(cache.redis_client.ping(), timeout=5.0)
            services["cache"] = "healthy"
        elif cache.local_cache is not None:
            services["cache"] = "degraded: local fallback"
        else:
            services["cache"] = "not_initialized"
    except Exception as e:
        services["cache"] = f"unhealthy: {str(e)}"
    
    overall_status = "healthy" if all(v == "healthy" for v in services.values()) else "degraded"
    
    from app.models.weather import HealthResponse
    return HealthResponse(
        status=overall_status,
        timestamp=datetime.now(),
        services=services,
    )

@router.get("/ready")
async def readiness_check():
    """Return ready only when mandatory serving dependencies are available."""
    health = await health_check()
    if health.status != "healthy":
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail={"status": "not_ready", "services": health.services})
    return {"status": "ready"}

@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes - instant response"""
    return {"status": "alive"}
