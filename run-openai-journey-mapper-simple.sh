#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting OpenAI Journey Mapper (o3) Service (Simple Mode) ===${NC}"

# Check if .env file exists in root directory
if [ ! -f .env ]; then
  echo -e "${RED}Error: No .env file found in the root directory!${NC}"
  exit 1
fi

# Extract OpenAI API key from root .env file
OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env | cut -d '=' -f2)

if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${RED}Error: No OPENAI_API_KEY found in the .env file!${NC}"
  exit 1
fi

echo -e "${GREEN}Found OpenAI API key in root .env file.${NC}"

# Create a fresh .env file for the OpenAI Journey Mapper
mkdir -p internal-solutions-openai-journey-mapper
cat > internal-solutions-openai-journey-mapper/.env << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=o3
REASONING_EFFORT=medium
EOF

echo -e "${GREEN}Created .env file for OpenAI Journey Mapper with API key.${NC}"

# Change to the OpenAI Journey Mapper directory and run the service
cd internal-solutions-openai-journey-mapper

# Create directories if they don't exist
mkdir -p logs uploads journey_maps static templates

# Copy API key error template if it doesn't exist
if [ ! -f "templates/api_key_error.html" ]; then
  mkdir -p templates
  cp templates/api_key_error.html templates/ 2>/dev/null || true
fi

echo -e "${YELLOW}Starting OpenAI Journey Mapper on port 8090...${NC}"
echo -e "${YELLOW}Access the service at: ${GREEN}http://localhost:8090${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the service${NC}\n"

# Make sure the standalone.py is executable
chmod +x standalone.py

# Run the standalone version for simplicity
python standalone.py