#!/bin/bash

# Fix environment variables for OpenAI API keys
# This script addresses the naming inconsistency between OPENAI_API_KEY and AZURE_OPENAI_KEY/AZURE_OPENAI_API_KEY

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Fixing OpenAI API key naming inconsistency ===${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: No .env file found in the current directory${NC}"
  exit 1
fi

# Get current OpenAI API key
OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env | cut -d'=' -f2)

if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${RED}Error: OPENAI_API_KEY not found in .env file${NC}"
  exit 1
fi

echo -e "${GREEN}Found OpenAI API key${NC}"

# Backup original .env file
cp .env .env.backup
echo -e "${GREEN}Created backup at .env.backup${NC}"

# Check if AZURE_OPENAI_API_KEY and AZURE_OPENAI_KEY already exist
if grep -q "AZURE_OPENAI_API_KEY" .env && grep -q "AZURE_OPENAI_KEY" .env; then
  echo -e "${YELLOW}AZURE_OPENAI_API_KEY and AZURE_OPENAI_KEY already exist in .env file. Updating values...${NC}"
  # Update the existing keys
  sed -i '' "s|AZURE_OPENAI_API_KEY=.*|AZURE_OPENAI_API_KEY=${OPENAI_API_KEY}|g" .env
  sed -i '' "s|AZURE_OPENAI_KEY=.*|AZURE_OPENAI_KEY=${OPENAI_API_KEY}|g" .env
else
  # Add the Azure OpenAI keys
  echo -e "\n# Azure OpenAI keys (using same OpenAI key)" >> .env
  echo "AZURE_OPENAI_API_KEY=${OPENAI_API_KEY}" >> .env
  echo "AZURE_OPENAI_KEY=${OPENAI_API_KEY}" >> .env
  echo -e "${GREEN}Added AZURE_OPENAI_API_KEY and AZURE_OPENAI_KEY to .env file${NC}"
fi

# Update Docker Compose configuration if running
if command -v docker &> /dev/null && docker ps &> /dev/null; then
  echo -e "${YELLOW}Updating running containers with new environment variables...${NC}"
  
  # Find containers that might need the Azure OpenAI keys
  CONTAINERS=$(docker ps --format "{{.Names}}" | grep -E "social-research|video")
  
  if [ -n "$CONTAINERS" ]; then
    for CONTAINER in $CONTAINERS; do
      echo -e "${GREEN}Updating container: ${CONTAINER}${NC}"
      docker exec $CONTAINER bash -c "echo AZURE_OPENAI_API_KEY=${OPENAI_API_KEY} >> /app/.env 2>/dev/null || echo 'Could not update container env'"
      docker exec $CONTAINER bash -c "echo AZURE_OPENAI_KEY=${OPENAI_API_KEY} >> /app/.env 2>/dev/null || echo 'Could not update container env'"
    done
  else
    echo -e "${YELLOW}No relevant containers found running${NC}"
  fi
fi

echo -e "${GREEN}✓ Environment variables fixed successfully!${NC}"
echo -e "${YELLOW}To apply these changes, you may need to restart your services:${NC}"
echo -e "  docker compose -f dynamic-compose.yml down"
echo -e "  docker compose -f dynamic-compose.yml up -d"
echo ""
echo -e "${YELLOW}Or use the provided restart script:${NC}"
echo -e "  ./backup-scripts/restart-all-services.sh"