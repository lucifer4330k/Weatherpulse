FROM apache/spark:3.4.1-python3

# spark_stream.py creates the Cassandra schema before starting the structured
# streaming sink. The upstream Spark image does not include this driver.
USER root
RUN pip install --no-cache-dir cassandra-driver==3.28.0 \
    && mkdir -p /opt/spark/checkpoints \
    && chown -R spark:spark /opt/spark/checkpoints
USER spark