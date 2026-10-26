from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    app_name: str = "India Weather Map API"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    # Open-Meteo
    open_meteo_base_url: str = "https://api.open-meteo.com/v1"
    open_meteo_geocoding_url: str = "https://geocoding-api.open-meteo.com/v1"

    # Cassandra
    cassandra_hosts: str = "localhost"
    cassandra_port: int = 9042
    cassandra_keyspace: str = "spark_streams"
    cassandra_table: str = "weather_data_real"
    cassandra_username: str = "cassandra"
    cassandra_password: str = "cassandra"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Cache TTL
    cache_ttl_current: int = 600
    cache_ttl_forecast: int = 1800
    cache_ttl_historical: int = 3600
    cache_ttl_geocode: int = 300

    # CORS - parse comma-separated string to list
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
