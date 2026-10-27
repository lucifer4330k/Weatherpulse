import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from cassandra.cluster import Cluster, Session
from cassandra.auth import PlainTextAuthProvider
from cassandra.query import SimpleStatement
from cassandra.concurrent import execute_concurrent_with_args
from app.config import settings
from app.locations import monitored_locations, location_for_city
from app.models.weather import WeatherTrends, HistoricalDataPoint, WeatherSource, Coordinates
from app.schema import ensure_schema

logger = logging.getLogger(__name__)

OBSERVATION_COLUMNS = (
    "station_id, timestamp, source_timestamp, ingested_at, source, city, country, "
    "latitude, longitude, temperature, humidity, pressure, wind_speed, "
    "wind_direction, precipitation, weather_condition, event_id, location_id, "
    "state_code, district, feels_like, wind_gust, cloud_cover, processed_at, "
    "wind_direction_degrees, weather_code, is_day, generation_method, quality_flags"
)


def observation_dict(row):
    return {name: getattr(row, name, None) for name in OBSERVATION_COLUMNS.split(", ")}

class CassandraClient:
    def __init__(self):
        self.cluster: Optional[Cluster] = None
        self.session: Optional[Session] = None
        self.keyspace = settings.cassandra_keyspace
        self.table = settings.cassandra_table

    async def connect(self):
        """Connect to Cassandra cluster and ensure schema exists"""
        try:
            auth_provider = PlainTextAuthProvider(
                username=settings.cassandra_username,
                password=settings.cassandra_password
            )
            hosts = settings.cassandra_hosts.split(",")
            self.cluster = Cluster(
                hosts,
                port=settings.cassandra_port,
                auth_provider=auth_provider,
                connect_timeout=10,
            )
            self.session = self.cluster.connect()
            
            ensure_schema(self.session, self.keyspace, self.table)
            self.session.set_keyspace(self.keyspace)

            logger.info(f"Connected to Cassandra at {hosts}:{settings.cassandra_port} and ensured keyspace {self.keyspace}")
        except Exception as e:
            logger.error(f"Failed to connect to Cassandra: {e}")
            raise

    async def close(self):
        """Close Cassandra connection"""
        if self.cluster:
            self.cluster.shutdown()
            logger.info("Cassandra connection closed")

    async def get_historical_for_city(self, city: str, days: int = 30) -> WeatherTrends:
        """Get historical weather data for a city from Cassandra"""
        if not self.session:
            await self.connect()

        location = location_for_city(city)
        city = location["city"] if location else city

        from datetime import timezone
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_timestamp = cutoff_date.isoformat()
        
        # Query weather data for the city
        query = f"""
        SELECT station_id, timestamp, source_timestamp, ingested_at, source, city, country, latitude, longitude,
               temperature, humidity, pressure, wind_speed, wind_direction, precipitation, weather_condition,
               event_id, location_id, state_code, district, feels_like, wind_gust, cloud_cover, processed_at,
               wind_direction_degrees, weather_code, is_day, generation_method, quality_flags
        FROM {self.keyspace}.{self.table}
        WHERE city = %s AND timestamp >= %s LIMIT 2000
        """
        
        try:
            statement = SimpleStatement(query, fetch_size=1000)
            rows = list(self.session.execute(statement, [city, cutoff_timestamp]))
            # Sort rows by timestamp ascending for trend display
            rows.sort(key=lambda r: r.timestamp)
            
            temp_data = []
            precip_data = []
            humidity_data = []
            
            for row in rows:
                # This table's timeline is collection history. `source_timestamp`
                # remains available for provenance without mislabelling it.
                timestamp = datetime.fromisoformat((row.source_timestamp or row.timestamp).replace("Z", "+00:00"))
                
                point = HistoricalDataPoint(
                    timestamp=timestamp,
                    temperature=row.temperature,
                    humidity=row.humidity,
                    pressure=row.pressure,
                    wind_speed=row.wind_speed,
                    precipitation=row.precipitation,
                    source=WeatherSource.CASSANDRA,
                )
                temp_data.append(point)
                precip_data.append(point)
                humidity_data.append(point)

            temps = [d.temperature for d in temp_data if d.temperature is not None]
            precips = [d.precipitation for d in precip_data if d.precipitation is not None]
            humidities = [d.humidity for d in humidity_data if d.humidity is not None]

            # Get location from first row
            first_row = rows[0] if rows else None
            lat = first_row.latitude if first_row else 0
            lon = first_row.longitude if first_row else 0

            return WeatherTrends(
                location=Coordinates(lat=lat, lon=lon),
                location_name=city,
                period=f"{days}d",
                temperature={
                    "min": min(temps) if temps else None,
                    "max": max(temps) if temps else None,
                    "avg": sum(temps) / len(temps) if temps else None,
                    "data": temp_data,
                },
                precipitation={
                    "total": None,
                    "avg": sum(precips) / len(precips) if precips else None,
                    "data": precip_data,
                },
                humidity={
                    "avg": sum(humidities) / len(humidities) if humidities else None,
                    "data": humidity_data,
                },
            )
        except Exception as e:
            logger.error(f"Cassandra query error for city '{city}': {e}")
            raise

    async def get_latest_for_city(self, city: str) -> Optional[Dict[str, Any]]:
        """Get the most recent weather record for a city"""
        if not self.session:
            await self.connect()

        # Query latest record for city (ordered by clustered timestamp DESC)
        canonical = location_for_city(city)
        city = canonical["city"] if canonical else city
        query = f"SELECT {OBSERVATION_COLUMNS} FROM {self.keyspace}.{self.table} WHERE city = %s LIMIT 1"
        
        try:
            statement = SimpleStatement(query, fetch_size=1)
            row = self.session.execute(statement, [city]).one()
            
            if row:
                return observation_dict(row)
            return None
        except Exception:
            logger.exception("Cassandra latest query failed for city '%s'", city)
            raise

    async def get_latest_for_cities(self, cities: List[str]) -> Dict[str, Dict[str, Any]]:
        """Return the latest row for each requested city without a table scan."""
        if not self.session:
            await self.connect()
        configured = {location["city"] for location in monitored_locations()}
        requested = list(dict.fromkeys(
            location["city"] for city in cities
            if (location := location_for_city(city)) and location["city"] in configured
        ))
        if not requested:
            return {}
        query = self.session.prepare(
            f"SELECT {OBSERVATION_COLUMNS} FROM {self.keyspace}.{self.table} WHERE city = ? LIMIT 1"
        )
        import asyncio
        responses = await asyncio.to_thread(
            execute_concurrent_with_args, self.session, query,
            [(city,) for city in requested], concurrency=8, raise_on_first_error=False,
        )
        results = {}
        for city, (success, rows) in zip(requested, responses):
            if not success:
                logger.error("Latest observation query failed for %s: %s", city, rows)
                raise rows
            row = rows.one()
            if row is not None:
                results[city] = observation_dict(row)
        return results

    async def get_all_cities(self) -> List[str]:
        """Get list of all cities with data"""
        if not self.session:
            await self.connect()

        observations = await self.get_latest_for_cities(
            [location["city"] for location in monitored_locations()]
        )
        return sorted(observations)

# Singleton
_cassandra_client: Optional[CassandraClient] = None

async def get_cassandra_client() -> CassandraClient:
    global _cassandra_client
    if _cassandra_client is None:
        _cassandra_client = CassandraClient()
        await _cassandra_client.connect()
    return _cassandra_client

async def close_cassandra_client():
    global _cassandra_client
    if _cassandra_client:
        await _cassandra_client.close()
        _cassandra_client = None
