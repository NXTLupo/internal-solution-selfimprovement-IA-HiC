#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== OpenAI Whisper API Key Update Script ===${NC}"

# Check if API key was provided as argument
if [ -z "$1" ]; then
  echo -e "${YELLOW}No API key provided as argument. Using the key from .env file.${NC}"
  
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
else
  OPENAI_API_KEY="$1"
  echo -e "${GREEN}Using provided API key${NC}"
  
  # Update the main .env file
  if [ -f .env ]; then
    # Check if OPENAI_API_KEY already exists
    if grep -q "OPENAI_API_KEY" .env; then
      sed -i '' "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=${OPENAI_API_KEY}|g" .env
    else
      echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> .env
    fi
    echo -e "${GREEN}Updated OPENAI_API_KEY in .env file${NC}"
  else
    echo "OPENAI_API_KEY=${OPENAI_API_KEY}" > .env
    echo -e "${GREEN}Created .env file with OPENAI_API_KEY${NC}"
  fi
  
  # Also update AZURE_OPENAI_API_KEY and AZURE_OPENAI_KEY
  if grep -q "AZURE_OPENAI_API_KEY" .env; then
    sed -i '' "s|AZURE_OPENAI_API_KEY=.*|AZURE_OPENAI_API_KEY=${OPENAI_API_KEY}|g" .env
  else
    echo "AZURE_OPENAI_API_KEY=${OPENAI_API_KEY}" >> .env
  fi
  
  if grep -q "AZURE_OPENAI_KEY" .env; then
    sed -i '' "s|AZURE_OPENAI_KEY=.*|AZURE_OPENAI_KEY=${OPENAI_API_KEY}|g" .env
  else
    echo "AZURE_OPENAI_KEY=${OPENAI_API_KEY}" >> .env
  fi
  echo -e "${GREEN}Updated Azure OpenAI keys in .env file${NC}"
fi

# Create .env file for video-analyzer
if [ ! -d "internal-solutions-video-analyzer" ]; then
  echo -e "${RED}Error: video-analyzer directory not found${NC}"
  exit 1
fi

# Create .env file with required variables
echo "OPENAI_API_KEY=${OPENAI_API_KEY}" > internal-solutions-video-analyzer/.env
echo "USE_WHISPER_API=true" >> internal-solutions-video-analyzer/.env
echo -e "${GREEN}Created .env file in internal-solutions-video-analyzer directory${NC}"

# Create a Docker Compose override file
cat > docker-compose.override.yml << EOF
version: '3'

services:
  video-analyzer:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - USE_WHISPER_API=true
    volumes:
      - ./internal-solutions-video-analyzer/.env:/app/.env

  social-research-backend:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AZURE_OPENAI_API_KEY=${OPENAI_API_KEY}
      - AZURE_OPENAI_KEY=${OPENAI_API_KEY}
EOF
echo -e "${GREEN}Created docker-compose.override.yml with OpenAI API key configuration${NC}"

# Check if Docker is running
if command -v docker &> /dev/null && docker ps &> /dev/null; then
  echo -e "${YELLOW}Updating running containers with new API key...${NC}"
  
  # Find video-analyzer container
  VIDEO_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "video-analyzer")
  
  if [ -n "$VIDEO_CONTAINER" ]; then
    echo -e "${GREEN}Updating container: ${VIDEO_CONTAINER}${NC}"
    # Create a temporary .env file to copy into the container
    echo "OPENAI_API_KEY=${OPENAI_API_KEY}" > temp_video_env
    echo "USE_WHISPER_API=true" >> temp_video_env
    docker cp temp_video_env ${VIDEO_CONTAINER}:/app/.env
    rm temp_video_env
    echo -e "${GREEN}Updated environment in video-analyzer container${NC}"
    
    # Restart the container
    docker restart ${VIDEO_CONTAINER}
    echo -e "${GREEN}Restarted video-analyzer container${NC}"
  else
    echo -e "${YELLOW}No video-analyzer container found running${NC}"
  fi
  
  # Find social-research-backend container
  SOCIAL_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "social-research-backend")
  
  if [ -n "$SOCIAL_CONTAINER" ]; then
    echo -e "${GREEN}Updating container: ${SOCIAL_CONTAINER}${NC}"
    # Update environment variables
    docker exec ${SOCIAL_CONTAINER} bash -c "echo OPENAI_API_KEY=${OPENAI_API_KEY} > /app/.env"
    docker exec ${SOCIAL_CONTAINER} bash -c "echo AZURE_OPENAI_API_KEY=${OPENAI_API_KEY} >> /app/.env"
    docker exec ${SOCIAL_CONTAINER} bash -c "echo AZURE_OPENAI_KEY=${OPENAI_API_KEY} >> /app/.env"
    echo -e "${GREEN}Updated environment in social-research-backend container${NC}"
    
    # Restart the container
    docker restart ${SOCIAL_CONTAINER}
    echo -e "${GREEN}Restarted social-research-backend container${NC}"
  else
    echo -e "${YELLOW}No social-research-backend container found running${NC}"
  fi
fi

echo -e "${BLUE}\n=== Whisper API Key Update Complete ===${NC}"
echo -e "${YELLOW}Your OpenAI API key has been configured for the Video Analyzer.${NC}"
echo -e "${YELLOW}If containers are still running, restart them to apply changes:${NC}"
echo -e "  docker compose -f dynamic-compose.yml restart video-analyzer"
echo -e "  docker compose -f dynamic-compose.yml restart social-research-backend"