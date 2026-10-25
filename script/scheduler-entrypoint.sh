#!/bin/bash
set -e

echo "=== Airflow Scheduler Entrypoint Started ==="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
# Try pg_isready first, fallback to netcat if not available
if command -v pg_isready &> /dev/null; then
  until pg_isready -h postgres -p 5432 -U airflow -d airflow; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
  done
else
  echo "pg_isready not found, using netcat..."
  until nc -z postgres 5432; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
  done
fi
echo "PostgreSQL is ready!"

# Install Python dependencies
if [ -e "/opt/airflow/requirements.txt" ]; then
  echo "Installing Python dependencies..."
  pip install --upgrade pip
  pip install --user -r /opt/airflow/requirements.txt
fi

# Run database migrations (in case webserver hasn't done it yet)
echo "Running database migrations..."
airflow db migrate

# Start the scheduler
echo "Starting Airflow scheduler..."
exec airflow scheduler