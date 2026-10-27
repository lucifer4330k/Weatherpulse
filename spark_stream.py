import logging
import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, current_timestamp, date_format
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    FloatType,
    IntegerType,
    BooleanType,
)
from weather_schema import ensure_schema

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "broker:29092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "weather_data_real")
CASSANDRA_HOST = os.getenv("CASSANDRA_HOST", "cassandra")
CASSANDRA_KEYSPACE = os.getenv("CASSANDRA_KEYSPACE", "spark_streams")
CASSANDRA_TABLE = os.getenv("CASSANDRA_TABLE", "weather_data_real")
WEATHER_SOURCE = os.getenv("WEATHER_SOURCE", "open-meteo")


def create_spark_connection():
    try:
        s_conn = (
            SparkSession.builder.appName("SparkDataStreaming")
            .config(
                "spark.jars.packages",
                "com.datastax.spark:spark-cassandra-connector_2.12:3.4.1,"
                "org.apache.spark:spark-sql-kafka-0-10_2.12:3.4.1",
            )
            .config("spark.cassandra.connection.host", CASSANDRA_HOST)
            .config("spark.sql.session.timeZone", "UTC")
            .getOrCreate()
        )
        s_conn.sparkContext.setLogLevel("WARN")
        logging.info("Spark connection created successfully!")
    except Exception as e:
        logging.exception("Couldn't create the Spark session")
        raise RuntimeError("Spark session initialization failed") from e
    return s_conn


def connect_to_kafka(spark_conn):
    try:
        spark_df = (
            spark_conn.readStream.format("kafka")
            .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS)
            .option("subscribe", KAFKA_TOPIC)
            .option("startingOffsets", "earliest")
            .load()
        )
        spark_df.printSchema()
        logging.info("Kafka DataFrame created successfully")
    except Exception as e:
        logging.exception("Kafka DataFrame could not be created")
        raise RuntimeError("Kafka source initialization failed") from e
    return spark_df


def create_cassandra_connection():
    try:
        from cassandra.cluster import Cluster
        cluster = Cluster([CASSANDRA_HOST])
        cas_session = cluster.connect()
        return cas_session
    except Exception as e:
        logging.exception("Could not create direct Python Cassandra connection")
        raise RuntimeError("Cassandra initialization failed") from e


def create_selection_df_from_kafka(spark_df):
    # Define the schema for the nested weather data
    schema = StructType(
        [
            StructField("station_id", StringType(), False),
            StructField("event_id", StringType(), True),
            StructField("timestamp", StringType(), False),
            StructField("source_timestamp", StringType(), False),
            StructField("ingested_at", StringType(), False),
            StructField("source", StringType(), False),
            StructField(
                "location",
                StructType(
                    [  # Nested JSON for location
                        StructField("city", StringType(), False),
                        StructField("id", StringType(), True),
                        StructField("state_code", StringType(), True),
                        StructField("state", StringType(), True),
                        StructField("district", StringType(), True),
                        StructField("country", StringType(), False),
                        StructField("latitude", FloatType(), False),
                        StructField("longitude", FloatType(), False),
                    ]
                ),
            ),
            StructField("temperature", FloatType(), False),
            StructField("feels_like", FloatType(), True),
            StructField("humidity", IntegerType(), False),
            StructField("pressure", FloatType(), False),
            StructField("wind_speed", FloatType(), False),
            StructField("wind_gust", FloatType(), True),
            StructField("wind_direction", StringType(), False),
            StructField("wind_direction_degrees", IntegerType(), True),
            StructField("precipitation", FloatType(), False),
            StructField("weather_condition", StringType(), False),
            StructField("weather_code", IntegerType(), True),
            StructField("is_day", BooleanType(), True),
            StructField("cloud_cover", IntegerType(), True),
            StructField("generation_method", StringType(), True),
            StructField("quality_flags", StringType(), True),
        ]
    )

    # Parse the Kafka value (JSON) according to the nested schema
    parsed_df = spark_df.selectExpr("CAST(value AS STRING)").select(
        from_json(col("value"), schema).alias("data")
    )

    # Flatten the nested "location" field
    flattened_df = parsed_df.select(
        col("data.station_id"),
        col("data.event_id"),
        col("data.timestamp"),
        col("data.source_timestamp"),
        col("data.ingested_at"),
        col("data.source"),
        col("data.location.city").alias("city"),
        col("data.location.id").alias("location_id"),
        col("data.location.state_code").alias("state_code"),
        col("data.location.district").alias("district"),
        col("data.location.country").alias("country"),
        col("data.location.latitude").alias("latitude"),
        col("data.location.longitude").alias("longitude"),
        col("data.temperature"),
        col("data.feels_like"),
        col("data.humidity"),
        col("data.pressure"),
        col("data.wind_speed"),
        col("data.wind_gust"),
        col("data.wind_direction"),
        col("data.wind_direction_degrees"),
        col("data.precipitation"),
        col("data.weather_condition"),
        col("data.weather_code"),
        col("data.is_day"),
        col("data.cloud_cover"),
        col("data.generation_method"),
        col("data.quality_flags"),
        date_format(current_timestamp(), "yyyy-MM-dd'T'HH:mm:ssXXX").alias("processed_at"),
    )

    # `from_json` produces null columns for malformed payloads.  Drop those
    # records before the Cassandra sink so invalid primary keys do not stop a
    # micro-batch and make the stream appear healthy while writing nothing.
    return flattened_df.filter(
        "station_id IS NOT NULL AND event_id IS NOT NULL AND location_id IS NOT NULL "
        "AND timestamp IS NOT NULL AND source_timestamp IS NOT NULL "
        f"AND ingested_at IS NOT NULL AND source = '{WEATHER_SOURCE}' AND city IS NOT NULL "
        "AND country = 'India' AND latitude BETWEEN 6 AND 38 AND longitude BETWEEN 68 AND 98 "
        "AND temperature BETWEEN -30 AND 60 AND humidity BETWEEN 0 AND 100 "
        "AND (precipitation IS NULL OR precipitation >= 0) "
        "AND to_timestamp(timestamp) IS NOT NULL AND to_timestamp(source_timestamp) IS NOT NULL "
        "AND to_timestamp(ingested_at) IS NOT NULL"
    )


def start_spark_stream():
    # Create Cassandra keyspace and table if direct client is available
    session = create_cassandra_connection()
    try:
        ensure_schema(session, CASSANDRA_KEYSPACE, CASSANDRA_TABLE)
    except Exception as e:
        logging.exception("Could not initialize Cassandra schema")
        raise
    finally:
        session.shutdown()

    # Create spark connection
    spark_conn = create_spark_connection()

    # Connect to Kafka with spark connection
    spark_df = connect_to_kafka(spark_conn)
    selection_df = create_selection_df_from_kafka(spark_df)

    print("Streaming is being started...")

    try:
        streaming_query = (
            selection_df.writeStream.format("org.apache.spark.sql.cassandra")
            .option("checkpointLocation", os.getenv("SPARK_CHECKPOINT_LOCATION", "/opt/spark/checkpoints/weather_data_real"))
            .option("keyspace", CASSANDRA_KEYSPACE)
            .option("table", CASSANDRA_TABLE)
            .start()
        )
        logging.info("Streaming query started successfully!")
        streaming_query.awaitTermination()
    except Exception as e:
        logging.exception("Streaming query failed")
        raise


if __name__ == "__main__":
    start_spark_stream()
