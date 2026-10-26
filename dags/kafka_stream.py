import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from kafka import KafkaProducer
from airflow import DAG
from airflow.operators.python import PythonOperator
import logging


default_args = {
    "owner": "airflow",
    "start_date": datetime(2024, 10, 4, 10, 00),
    "email": ["debanjanmaji700@gmail.com"],
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(seconds=30),
    "retry_exponential_backoff": True,
}

logging.basicConfig(level=logging.INFO)

# Kafka producer setup
AIRFLOW_ORCHESTRATOR = True  # Determine orchestration provider
KAFKA_HOSTS = [os.getenv("KAFKA_BOOTSTRAP_SERVERS", "broker:29092")]
WEATHER_LOCATIONS = (
    ("Delhi", 28.6139, 77.2090),
    ("Mumbai", 19.0760, 72.8777),
    ("Kolkata", 22.5726, 88.3639),
    ("Chennai", 13.0827, 80.2707),
    ("Bengaluru", 12.9716, 77.5946),
)


def _wind_direction_text(degrees):
    directions = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
    return directions[round(float(degrees) / 45) % 8]


def fetch_weather_event(city, latitude, longitude):
    """Fetch one real observation and normalize it to the Spark Kafka schema."""
    params = urllib.parse.urlencode({
        "latitude": latitude, "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure",
        "timezone": "UTC", "wind_speed_unit": "kmh", "precipitation_unit": "mm",
    })
    with urllib.request.urlopen(f"https://api.open-meteo.com/v1/forecast?{params}", timeout=20) as response:
        current = json.load(response).get("current", {})
    required = ("time", "temperature_2m", "relative_humidity_2m", "precipitation", "weather_code", "wind_speed_10m", "wind_direction_10m", "surface_pressure")
    missing = [field for field in required if current.get(field) is None]
    if missing:
        raise ValueError(f"Open-Meteo event for {city} missing fields: {', '.join(missing)}")
    return {
        "station_id": f"open-meteo-{city.lower().replace(' ', '-')}",
        "timestamp": current["time"],
        "location": {
            "city": city, "country": "India", "latitude": float(latitude), "longitude": float(longitude),
        },
        "temperature": float(current["temperature_2m"]), "humidity": int(current["relative_humidity_2m"]),
        "pressure": float(current["surface_pressure"]), "wind_speed": float(current["wind_speed_10m"]),
        "wind_direction": _wind_direction_text(current["wind_direction_10m"]),
        "precipitation": float(current["precipitation"]), "weather_condition": str(current["weather_code"]),
    }


def create_kafka_producer():
    return KafkaProducer(
        bootstrap_servers=KAFKA_HOSTS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        max_block_ms=5000,
        linger_ms=100,
        retries=5,
        acks="all",
    )


def stream_weather_data():
    """Collect scheduled real weather observations and publish them to Kafka."""
    producer = None
    try:
        producer = create_kafka_producer()
        for city, latitude, longitude in WEATHER_LOCATIONS:
            weather_data = fetch_weather_event(city, latitude, longitude)
            producer.send("weather_data", value=weather_data).get(timeout=10)
        logging.info("Published real weather observations for %d locations.", len(WEATHER_LOCATIONS))

    except Exception as e:
        logging.error(f"Error occurred while streaming data to Kafka: {e}")
        raise
    finally:
        if producer:
            producer.flush()  # Flush any remaining messages
            producer.close(timeout=60)
            logging.info("Kafka producer closed.")


if AIRFLOW_ORCHESTRATOR:
    # Airflow DAG definition
    with DAG(
        "weather_data_streaming",
        default_args=default_args,
        schedule_interval=timedelta(minutes=10),
        catchup=False,
        max_active_runs=1,
    ) as dag:

        # Kafka streaming task
        kafka_streaming_task = PythonOperator(
            task_id="stream_weather_data_kafka",
            python_callable=stream_weather_data,
            execution_timeout=timedelta(minutes=15),
        )

else:
    stream_weather_data()
