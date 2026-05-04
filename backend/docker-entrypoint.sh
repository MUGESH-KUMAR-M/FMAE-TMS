#!/bin/sh

# FMAE-TMS Backend Entrypoint Script
# Wait for DB to be ready and run migrations

set -e

# Function to wait for DB
wait_for_db() {
  echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
  while ! nc -z $DB_HOST $DB_PORT; do
    sleep 1
  done
  echo "PostgreSQL is up and running!"
}

# Run DB check if not in development
if [ "$NODE_ENV" != "development" ]; then
  wait_for_db
fi

# Run migrations and seed data
# This handles table creation and the super-admin account
echo "Running database setup (migrations & seed)..."
npm run setup || echo "Setup skipped or already completed."

# Start the application
echo "Starting application..."
exec "$@"
