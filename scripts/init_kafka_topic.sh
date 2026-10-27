#!/usr/bin/env bash
set -euo pipefail

topic="${1:?topic name required}"
partitions="${2:-3}"
bootstrap="${KAFKA_BOOTSTRAP_SERVERS:-broker:29092}"

for attempt in $(seq 1 60); do
  if kafka-topics --bootstrap-server "$bootstrap" --create --if-not-exists \
      --topic "$topic" --partitions "$partitions" --replication-factor 1 \
      --config retention.ms=604800000 && \
      kafka-topics --bootstrap-server "$bootstrap" --describe --topic "$topic"; then
    exit 0
  fi
  echo "Kafka topic $topic is not ready (attempt $attempt/60); retrying in 5s" >&2
  sleep 5
done

echo "Kafka topic $topic could not be initialized" >&2
exit 1
