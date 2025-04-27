#!/bin/bash
set -e

# Write production key if provided
if [ -n "$RAILS_PRODUCTION_KEY" ]; then
  echo "$RAILS_PRODUCTION_KEY" > /app/config/credentials/production.key
  chmod 600 /app/config/credentials/production.key
fi

# Wait for database to be ready
echo "Waiting for database to be ready..."
echo "Database URL: $DATABASE_URL"
echo "Rails environment: $RAILS_ENV"

until bundle exec rails db:version; do
  echo "Database is unavailable - sleeping"
  echo "Error details:"
  bundle exec rails db:version 2>&1 || true
  sleep 1
done
echo "Database is ready!"

# Run migrations if needed, using a lock file to prevent concurrent migrations
MIGRATION_LOCK_FILE="/tmp/migration.lock"
if [ ! -f "$MIGRATION_LOCK_FILE" ]; then
  touch "$MIGRATION_LOCK_FILE"
  echo "Running database migrations..."
  bundle exec rails db:migrate
  rm -f "$MIGRATION_LOCK_FILE"
else
  echo "Migrations are already running in another container, skipping..."
  # Wait for migrations to complete
  while [ -f "$MIGRATION_LOCK_FILE" ]; do
    echo "Waiting for migrations to complete..."
    sleep 1
  done
fi

# Execute the main command
exec "$@" 