import json
import os
from datetime import datetime, timedelta
from kafka import KafkaProducer
from airflow import DAG
from airflow.operators.python import PythonOperator
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from weather_ingest import (
    fetch_weather_event as collect_weather_event,
    fetch_weather_batch as collect_weather_batch,
    load_locations,
)


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

KAFKA_HOSTS = [os.getenv("KAFKA_BOOTSTRAP_SERVERS", "broker:29092")]
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "weather_data_real")
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
        limit_setting = os.getenv("WEATHER_MAX_LOCATIONS")
        limit = int(limit_setting) if limit_setting else None
        if limit is not None and limit < 1:
            raise ValueError("WEATHER_MAX_LOCATIONS must be positive")
        locations = load_locations(limit=limit)
        workers = max(1, min(4, int(os.getenv("WEATHER_FETCH_WORKERS", "4"))))
        batch_size = max(1, min(10, int(os.getenv("WEATHER_BATCH_SIZE", "10"))))
        sent = 0
        failures = []
        collected = []
        for start in range(0, len(locations), batch_size):
            batch = locations[start:start + batch_size]
            try:
                collected.extend(zip(batch, collect_weather_batch(batch)))
            except Exception:
                logging.exception("Batch collection failed; retrying %d locations individually", len(batch))
                with ThreadPoolExecutor(max_workers=workers) as pool:
                    pending = {pool.submit(collect_weather_event, location): location for location in batch}
                    for future in as_completed(pending):
                        location = pending[future]
                        try:
                            collected.append((location, future.result()))
                        except Exception:
                            logging.exception("Failed to collect %s", location["id"])
                            failures.append(location["id"])
        for location, weather_data in collected:
            try:
                producer.send(KAFKA_TOPIC, key=weather_data["station_id"].encode("utf-8"), value=weather_data).get(timeout=30)
                sent += 1
            except Exception:
                logging.exception("Failed to publish %s", location["id"])
                failures.append(location["id"])
        logging.info("Published %d/%d real observations to %s; failed=%s", sent, len(locations), KAFKA_TOPIC, failures)
        if failures:
            raise RuntimeError(f"{len(failures)} weather locations failed: {failures}")

    except Exception as e:
        logging.error(f"Error occurred while streaming data to Kafka: {e}")
        raise
    finally:
        if producer:
            producer.flush()  # Flush any remaining messages
            producer.close(timeout=60)
            logging.info("Kafka producer closed.")


with DAG(
    "weather_data_streaming",
    default_args=default_args,
    schedule_interval=timedelta(minutes=int(os.getenv("WEATHER_INGEST_MINUTES", "30"))),
    catchup=False,
    max_active_runs=1,
    is_paused_upon_creation=False,
) as dag:
    kafka_streaming_task = PythonOperator(
        task_id="stream_weather_data_kafka",
        python_callable=stream_weather_data,
        execution_timeout=timedelta(minutes=15),
    )
