import logging
import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    FloatType,
    IntegerType,
)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "broker:29092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "weather_data")
CASSANDRA_HOST = os.getenv("CASSANDRA_HOST", "cassandra")
CASSANDRA_KEYSPACE = os.getenv("CASSANDRA_KEYSPACE", "spark_streams")
CASSANDRA_TABLE = os.getenv("CASSANDRA_TABLE", "weather_data")


def create_keyspace(session):
    session.execute(
        f"""
        CREATE KEYSPACE IF NOT EXISTS {CASSANDRA_KEYSPACE}
        WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': '1'}};
    """
    )
    print("Keyspace created successfully!")


def create_table(session):
    session.execute(
        f"""
    CREATE TABLE IF NOT EXISTS {CASSANDRA_KEYSPACE}.{CASSANDRA_TABLE} (
        station_id TEXT,
        timestamp TEXT,
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
    """
    )
    print("Weather data table created successfully!")


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
            StructField("timestamp", StringType(), False),
            StructField(
                "location",
                StructType(
                    [  # Nested JSON for location
                        StructField("city", StringType(), False),
                        StructField("country", StringType(), False),
                        StructField("latitude", FloatType(), False),
                        StructField("longitude", FloatType(), False),
                    ]
                ),
            ),
            StructField("temperature", FloatType(), False),
            StructField("humidity", IntegerType(), False),
            StructField("pressure", FloatType(), False),
            StructField("wind_speed", FloatType(), False),
            StructField("wind_direction", StringType(), False),
            StructField("precipitation", FloatType(), False),
            StructField("weather_condition", StringType(), False),
        ]
    )

    # Parse the Kafka value (JSON) according to the nested schema
    parsed_df = spark_df.selectExpr("CAST(value AS STRING)").select(
        from_json(col("value"), schema).alias("data")
    )

    # Flatten the nested "location" field
    flattened_df = parsed_df.select(
        col("data.station_id"),
        col("data.timestamp"),
        col("data.location.city").alias("city"),
        col("data.location.country").alias("country"),
        col("data.location.latitude").alias("latitude"),
        col("data.location.longitude").alias("longitude"),
        col("data.temperature"),
        col("data.humidity"),
        col("data.pressure"),
        col("data.wind_speed"),
        col("data.wind_direction"),
        col("data.precipitation"),
        col("data.weather_condition"),
    )

    # `from_json` produces null columns for malformed payloads.  Drop those
    # records before the Cassandra sink so invalid primary keys do not stop a
    # micro-batch and make the stream appear healthy while writing nothing.
    return flattened_df.filter(
        "station_id IS NOT NULL AND timestamp IS NOT NULL AND city IS NOT NULL "
        "AND country IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL "
        "AND temperature IS NOT NULL AND humidity IS NOT NULL AND pressure IS NOT NULL "
        "AND wind_speed IS NOT NULL AND wind_direction IS NOT NULL "
        "AND precipitation IS NOT NULL AND weather_condition IS NOT NULL"
    )


def start_spark_stream():
    # Create Cassandra keyspace and table if direct client is available
    session = create_cassandra_connection()
    try:
        create_keyspace(session)
        create_table(session)
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
            .option("checkpointLocation", os.getenv("SPARK_CHECKPOINT_LOCATION", "/opt/spark/checkpoints/weather_data"))
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
