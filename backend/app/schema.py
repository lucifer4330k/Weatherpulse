"""Shared, additive Cassandra schema for the real and synthetic streams."""

import re
from cassandra import InvalidRequest

FIELDS = {
    "station_id": "TEXT", "timestamp": "TEXT", "source_timestamp": "TEXT",
    "ingested_at": "TEXT", "source": "TEXT", "city": "TEXT",
    "country": "TEXT", "latitude": "FLOAT", "longitude": "FLOAT",
    "temperature": "FLOAT", "humidity": "INT", "pressure": "FLOAT",
    "wind_speed": "FLOAT", "wind_direction": "TEXT",
    "wind_direction_degrees": "INT", "precipitation": "FLOAT",
    "weather_condition": "TEXT", "weather_code": "INT", "is_day": "BOOLEAN",
    "event_id": "TEXT", "location_id": "TEXT", "state_code": "TEXT",
    "district": "TEXT", "feels_like": "FLOAT", "wind_gust": "FLOAT",
    "cloud_cover": "INT", "processed_at": "TEXT",
    "generation_method": "TEXT", "quality_flags": "TEXT",
}
PRIMARY_COLUMNS = {"city", "timestamp", "station_id"}


def ensure_schema(session, keyspace, table):
    """Create the table or migrate old volumes without deleting observations."""
    for identifier in (keyspace, table):
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", identifier):
            raise ValueError(f"Unsafe Cassandra identifier: {identifier!r}")
    session.execute(
        f"CREATE KEYSPACE IF NOT EXISTS {keyspace} "
        "WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}"
    )
    columns_sql = ", ".join(f"{name} {type_name}" for name, type_name in FIELDS.items())
    session.execute(
        f"CREATE TABLE IF NOT EXISTS {keyspace}.{table} "
        f"({columns_sql}, PRIMARY KEY ((city), timestamp, station_id)) "
        "WITH CLUSTERING ORDER BY (timestamp DESC, station_id ASC)"
    )
    session.cluster.refresh_schema_metadata()
    existing = session.cluster.metadata.keyspaces[keyspace].tables[table].columns
    for name, type_name in FIELDS.items():
        if name in existing or name in PRIMARY_COLUMNS:
            continue
        try:
            session.execute(f"ALTER TABLE {keyspace}.{table} ADD {name} {type_name}")
        except InvalidRequest:
            # A concurrent service may have added the same column. Re-read
            # metadata and suppress only that exact harmless race.
            session.cluster.refresh_schema_metadata()
            if name not in session.cluster.metadata.keyspaces[keyspace].tables[table].columns:
                raise
    session.cluster.refresh_schema_metadata()
