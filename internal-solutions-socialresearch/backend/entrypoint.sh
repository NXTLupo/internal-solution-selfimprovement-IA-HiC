#!/bin/bash
set -e

# Run initialization script
echo "Running initialization script..."
python /app/startup.py

# Start Gunicorn
echo "Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:${PORT:-8081} --workers ${GUNICORN_WORKERS:-1} --timeout ${GUNICORN_TIMEOUT:-240} "app:create_app()" 