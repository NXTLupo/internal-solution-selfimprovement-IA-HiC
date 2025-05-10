#!/bin/sh

echo "Initializing database..."
python -m app.db_init
echo "Database initialized!"

echo "Starting application..."
exec "$@" 