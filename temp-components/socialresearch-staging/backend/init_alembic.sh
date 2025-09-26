#!/bin/bash
# Initialize Alembic for database migrations

# Create alembic directory if it doesn't exist
mkdir -p alembic

# Initialize alembic
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Run the migration
alembic upgrade head

echo "Alembic initialized and initial migration created!" 