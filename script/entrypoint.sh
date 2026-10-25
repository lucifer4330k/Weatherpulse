#!/bin/bash
set -e

echo "=== Airflow Webserver Entrypoint Started ==="

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

# Initialize/upgrade the database
echo "Running database migrations..."
airflow db migrate

# Create admin user if it doesn't exist
echo "Creating admin user..."
airflow users create \
  --username admin \
  --firstname admin \
  --lastname admin \
  --role Admin \
  --email admin@example.com \
  --password admin \
  2>/dev/null || echo "Admin user already exists, skipping creation."

# Start the webserver
echo "Starting Airflow webserver..."
exec airflow webserver