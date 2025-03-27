#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
until bundle exec rails db:version > /dev/null 2>&1; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is ready!"

# Run migrations if needed
echo "Running database migrations..."
bundle exec rails db:migrate

# Execute the main command
exec "$@" 