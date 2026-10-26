import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from cassandra.cluster import Cluster, Session
from cassandra.auth import PlainTextAuthProvider
from cassandra.query import SimpleStatement
from app.config import settings
from app.models.weather import WeatherTrends, HistoricalDataPoint, WeatherSource, Coordinates

logger = logging.getLogger(__name__)

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
            
            # Ensure keyspace exists
            self.session.execute(f"""
                CREATE KEYSPACE IF NOT EXISTS {self.keyspace}
                WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': '1'}};
            """)
            self.session.set_keyspace(self.keyspace)

            # Ensure table exists
            self.session.execute(f"""
                CREATE TABLE IF NOT EXISTS {self.keyspace}.{self.table} (
                    station_id TEXT,
                    timestamp TEXT,
                    source_timestamp TEXT,
                    ingested_at TEXT,
                    source TEXT,
                    city TEXT,
                    country TEXT,
                    latitude FLOAT,
                    longitude FLOAT,
                    temperature FLOAT,
                    humidity INT,
                    pressure FLOAT,
                    wind_speed FLOAT,
                    wind_direction TEXT,
                    precipitation FLOAT,
                    weather_condition TEXT,
                    PRIMARY KEY ((city), timestamp, station_id)
                ) WITH CLUSTERING ORDER BY (timestamp DESC, station_id ASC);
            """)

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

        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Query weather data for the city
        query = f"""
        SELECT station_id, timestamp, source_timestamp, ingested_at, source, city, country, latitude, longitude,
               temperature, humidity, pressure, wind_speed, wind_direction, precipitation, weather_condition
        FROM {self.keyspace}.{self.table}
        WHERE city = %s AND timestamp >= %s
        """
        
        try:
            statement = SimpleStatement(query, fetch_size=1000)
            rows = list(self.session.execute(statement, [city, cutoff_date.isoformat()]))
            # Sort rows by timestamp ascending for trend display
            rows.sort(key=lambda r: r.timestamp)
            
            temp_data = []
            precip_data = []
            humidity_data = []
            
            for row in rows:
                # This table's timeline is collection history. `source_timestamp`
                # remains available for provenance without mislabelling it.
                timestamp = datetime.fromisoformat((row.ingested_at or row.timestamp).replace("Z", "+00:00"))
                
                temp_data.append(HistoricalDataPoint(
                    timestamp=timestamp,
                    temperature=row.temperature,
                    humidity=row.humidity,
                    pressure=row.pressure,
                    wind_speed=row.wind_speed,
                    precipitation=row.precipitation,
                    source=WeatherSource.CASSANDRA,
                ))
                precip_data.append(HistoricalDataPoint(
                    timestamp=timestamp,
                    temperature=0,
                    humidity=0,
                    pressure=0,
                    wind_speed=0,
                    precipitation=row.precipitation,
                    source=WeatherSource.CASSANDRA,
                ))
                humidity_data.append(HistoricalDataPoint(
                    timestamp=timestamp,
                    temperature=0,
                    humidity=row.humidity,
                    pressure=0,
                    wind_speed=0,
                    precipitation=0,
                    source=WeatherSource.CASSANDRA,
                ))

            temps = [d.temperature for d in temp_data]
            precips = [d.precipitation for d in precip_data]
            humidities = [d.humidity for d in humidity_data]

            # Get location from first row
            first_row = rows[0] if rows else None
            lat = first_row.latitude if first_row else 0
            lon = first_row.longitude if first_row else 0

            return WeatherTrends(
                location=Coordinates(lat=lat, lon=lon),
                location_name=city,
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
        except Exception as e:
            logger.error(f"Cassandra query error for city '{city}': {e}")
            raise

    async def get_latest_for_city(self, city: str) -> Optional[Dict[str, Any]]:
        """Get the most recent weather record for a city"""
        if not self.session:
            await self.connect()

        # Query latest record for city (ordered by clustered timestamp DESC)
        query = f"""
        SELECT station_id, timestamp, source_timestamp, ingested_at, source, city, country, latitude, longitude,
               temperature, humidity, pressure, wind_speed, wind_direction, precipitation, weather_condition
        FROM {self.keyspace}.{self.table}
        WHERE city = %s
        LIMIT 1
        """
        
        try:
            statement = SimpleStatement(query, fetch_size=1)
            row = self.session.execute(statement, [city]).one()
            
            if row:
                return {
                    "station_id": str(row.station_id),
                    "timestamp": row.timestamp,
                    "source_timestamp": row.source_timestamp,
                    "ingested_at": row.ingested_at,
                    "source": row.source,
                    "city": row.city,
                    "country": row.country,
                    "latitude": row.latitude,
                    "longitude": row.longitude,
                    "temperature": row.temperature,
                    "humidity": row.humidity,
                    "pressure": row.pressure,
                    "wind_speed": row.wind_speed,
                    "wind_direction": row.wind_direction,
                    "precipitation": row.precipitation,
                    "weather_condition": row.weather_condition,
                }
            return None
        except Exception as e:
            logger.error(f"Cassandra latest query error for city '{city}': {e}")
            return None

    async def get_state_summary(self, state_code: str) -> List[Dict[str, Any]]:
        """Get weather summary for cities in a state"""
        if not self.session:
            await self.connect()

        # This would require a mapping of cities to states
        # For now, return empty list - would need a proper state-city mapping
        return []

    async def get_all_cities(self) -> List[str]:
        """Get list of all cities with data"""
        if not self.session:
            await self.connect()

        query = f"SELECT DISTINCT city FROM {self.keyspace}.{self.table}"
        try:
            rows = self.session.execute(query)
            return [row.city for row in rows if row.city]
        except Exception as e:
            logger.error(f"Cassandra get cities error: {e}")
            return []

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
