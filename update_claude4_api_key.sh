#!/bin/bash

# Stop the container
docker stop nxthumans_ai_cx_workbench-claude4-journey-mapper-1

# Create or update the .env file
echo "ANTHROPIC_API_KEY=***REDACTED-ANTHROPIC-KEY***" > "internal-solutions-claude4-journey-mapper/.env"

# Create a new docker-compose file with hardcoded API key
cat > docker-compose-claude4-fixed.yml << 'EOF'
version: '3'
services:
  # Claude 4 Journey Mapper - New journey mapping tool optimized for Claude 4
  claude4-journey-mapper:
    image: python:3.10-slim
    ports:
      - "${CLAUDE4_JOURNEY_MAPPER_PORT:-8095}:8000"
    environment:
      - ANTHROPIC_API_KEY=***REDACTED-ANTHROPIC-KEY***
      - PORT=8000
      - ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
    volumes:
      - ./internal-solutions-claude4-journey-mapper:/app
    working_dir: /app
    command: >
      bash -c "apt-get update && apt-get install -y build-essential python3-dev wkhtmltopdf xvfb libpq-dev git curl make &&
              pip install --no-cache-dir --upgrade pip setuptools wheel &&
              pip install --no-cache-dir -r requirements.txt &&
              mkdir -p logs uploads journey_maps &&
              python run.py"
    networks:
      - nxt-humans-network

networks:
  nxt-humans-network:
    external: true
EOF

# Restart with the fixed compose file
docker-compose -f docker-compose-claude4-fixed.yml up -d

echo "API key updated and service restarted"