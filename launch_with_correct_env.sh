#!/bin/bash

# Load the correct environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Verify the correct key is loaded
echo "Using OpenAI API Key ending in: ${OPENAI_API_KEY: -4}"

# Start Docker Compose with the correct environment
docker compose -f docker-compose-all.yml -f docker-compose-all.override.yml up -d

echo "Services started with correct API keys from .env file"