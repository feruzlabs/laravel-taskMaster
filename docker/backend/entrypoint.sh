#!/bin/sh
set -e

# Wait for DB if needed
if [ -n "$DB_HOST" ]; then
  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  for i in $(seq 1 60); do
    (echo > /dev/tcp/$DB_HOST/$DB_PORT) >/dev/null 2>&1 && break
    sleep 1
  done
fi

# Ensure we are not accidentally using local sqlite file
if [ -f database/database.sqlite ]; then
  echo "Removing leftover SQLite file to avoid accidental sqlite connection"
  rm -f database/database.sqlite || true
fi

# Clear caches to pick up env from container
php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true

# Run migrations
php artisan migrate --force --no-interaction || true

# Start server
exec php artisan serve --host=0.0.0.0 --port=8000 