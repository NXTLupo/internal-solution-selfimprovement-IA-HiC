#!/bin/bash

# Run the Claude 4 Journey Mapper service with MCP integration

# Create necessary directories
mkdir -p logs uploads journey_maps

# Check if Docker network exists, create if not
if ! docker network inspect workbench-network >/dev/null 2>&1; then
  echo "Creating Docker network: workbench-network"
  docker network create workbench-network
fi

# Run the services with docker-compose
docker compose -f docker-compose-integration.yml up -d

echo "Claude 4 Journey Mapper is running with MCP integration"
echo "Journey Mapper URL: http://localhost:8090"
echo "MCP Service URL: http://localhost:8091"