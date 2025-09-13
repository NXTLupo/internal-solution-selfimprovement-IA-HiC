#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}NXT HUMANS AI CX WORKBENCH - CLAUDE 4 JOURNEY MAPPER INTEGRATION FIX${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Check if Docker is running
docker info >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

echo -e "${YELLOW}Checking for Claude 4 Journey Mapper components...${NC}"

# Check if the Claude 4 Journey Mapper directory exists
if [ ! -d "internal-solutions-claude4-journey-mapper" ]; then
  echo -e "${RED}Error: Claude 4 Journey Mapper directory not found!${NC}"
  exit 1
fi

# Check if docker-compose-all.yml.fixed exists
if [ ! -f "docker-compose-all.yml.fixed" ]; then
  echo -e "${RED}Error: docker-compose-all.yml.fixed not found!${NC}"
  exit 1
fi

# Skip template checks since they might be confusing the script
echo -e "${YELLOW}Skipping template checks - we'll update them to ensure they contain the required references...${NC}"

# Update enhanced-index.html if needed
if [ -f "launchpad/templates/enhanced-index.html" ]; then
  echo -e "${YELLOW}Ensuring Claude 4 Journey Mapper card is in enhanced-index.html...${NC}"
  
  # Check if the card exists, if not add it to the data analysis section
  grep -q "claude4-journey-mapper-status" "launchpad/templates/enhanced-index.html"
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Adding Claude 4 Journey Mapper card to enhanced-index.html...${NC}"
    
    sed -i.bak '/<div class="nxt-card app-card scale-in animate-delay-3-5">/i \
      <div class="nxt-card app-card scale-in animate-delay-3-75 highlight-card">\
        <div class="status-indicator status-unknown" id="claude4-journey-mapper-status"></div>\
        <div class="app-icon">\
          <i class="fa-solid fa-map-pin"></i>\
        </div>\
        <h3 class="app-title">Journey Mapper (Claude 4)</h3>\
        <p class="app-description">Our most advanced journey mapping tool powered by Claude 4, optimized for detailed customer insight extraction.</p>\
        <div class="app-cta">\
          <a href="{{ claude4_journey_mapper_url }}" id="claude4-journey-mapper-url" target="_blank" class="nxt-btn nxt-btn-primary nxt-btn-block">\
            <i class="fa-solid fa-play mr-2"></i> Launch\
          </a>\
        </div>\
      </div>\
    ' "launchpad/templates/enhanced-index.html"
  fi
fi

# Update status-enhanced.html if needed
if [ -f "launchpad/templates/status-enhanced.html" ]; then
  echo -e "${YELLOW}Ensuring Claude 4 Journey Mapper card is in status-enhanced.html...${NC}"
  
  # Check if the card exists, if not add it
  grep -q "Journey Mapper (Claude 4)" "launchpad/templates/status-enhanced.html"
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Adding Claude 4 Journey Mapper card to status-enhanced.html...${NC}"
    
    sed -i.bak '/<div class="service-card scale-in animate-delay-1-5">/i \
      <div class="service-card scale-in animate-delay-1-75 highlight">\
        <div class="service-header">\
          <h3 class="service-name">Journey Mapper (Claude 4)</h3>\
          <span class="status-badge status-{{ '\''running'\'' if services_status.claude4_journey_mapper.status == '\''running'\'' else '\''offline'\'' if services_status.claude4_journey_mapper.status == '\''offline'\'' else '\''unknown'\'' }}">\
            {{ services_status.claude4_journey_mapper.status|capitalize }}\
          </span>\
        </div>\
        <div class="service-info">\
          <p><strong>Internal URL:</strong> {{ service_urls.claude4_journey_mapper.internal_url }}</p>\
          <p><strong>Client URL:</strong> {{ service_urls.claude4_journey_mapper.client_url }}</p>\
          <p><strong>Last Checked:</strong> {{ services_status.claude4_journey_mapper.last_checked }}</p>\
        </div>\
        <div class="service-actions">\
          <a href="{{ service_urls.claude4_journey_mapper.client_url }}" target="_blank" class="nxt-btn nxt-btn-primary nxt-btn-block">\
            <i class="fa-solid fa-external-link-alt mr-2"></i> Open Journey Mapper (Claude 4)\
          </a>\
        </div>\
      </div>\
    ' "launchpad/templates/status-enhanced.html"
  fi
  
  # Also ensure there's a Claude 4 tab in the service logs section
  grep -q "data-service=\"claude4-journey-mapper\"" "launchpad/templates/status-enhanced.html"
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Adding Claude 4 Journey Mapper tab to logs section in status-enhanced.html...${NC}"
    
    sed -i.bak '/<div class="service-tab" data-service="openai-journey-mapper">Journey Mapper (o3)<\/div>/a \
          <div class="service-tab" data-service="claude4-journey-mapper">Journey Mapper (Claude 4)</div>\
    ' "launchpad/templates/status-enhanced.html"
  fi
fi

# Get API keys from .env file or environment
if [ -f ".env" ]; then
  echo -e "${YELLOW}Reading API keys from .env file...${NC}"
  source .env
else
  echo -e "${YELLOW}No .env file found, checking environment variables...${NC}"
  if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}Error: ANTHROPIC_API_KEY not found in environment!${NC}"
    exit 1
  fi
  if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}Error: OPENAI_API_KEY not found in environment!${NC}"
    exit 1
  fi
fi

# Stop all services
echo -e "${YELLOW}Stopping all services...${NC}"
docker compose -f docker-compose-all.yml.fixed down

# Kill any processes on the required ports
echo -e "${YELLOW}Freeing up ports...${NC}"
ports=(8000 8080 8090 8095 5001 5002 3000 8081 8500 8501 8502 8503 8504 8505 8506)
for port in "${ports[@]}"; do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Create an override file with the API keys
echo -e "${YELLOW}Creating docker-compose override file with API keys...${NC}"
cat > docker-compose-all.override.yml << EOF
services:
  journey-mapper:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ANTHROPIC_MODEL=claude-3-7-sonnet-20250219

  claude4-journey-mapper:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ANTHROPIC_MODEL=anthropic.claude-sonnet-4-20250514-v1:0

  openai-journey-mapper:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=o3
      - REASONING_EFFORT=medium

  video-analyzer:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - USE_WHISPER_API=true

  agent:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
EOF

# Copy the fixed docker-compose file to be the main one
echo -e "${YELLOW}Setting docker-compose-all.yml.fixed as the main docker-compose file...${NC}"
cp docker-compose-all.yml.fixed docker-compose-all.yml

# Start all services with the fixed docker-compose file
echo -e "${YELLOW}Starting all services with the fixed docker-compose file...${NC}"
docker compose -f docker-compose-all.yml -f docker-compose-all.override.yml up -d

# Check if services are running
echo -e "${YELLOW}Checking if services are running...${NC}"
sleep 10
docker ps | grep claude4-journey-mapper
if [ $? -ne 0 ]; then
  echo -e "${RED}Warning: Claude 4 Journey Mapper container not found! Check docker logs.${NC}"
else
  echo -e "${GREEN}Claude 4 Journey Mapper container is running!${NC}"
fi

docker ps | grep launchpad
if [ $? -ne 0 ]; then
  echo -e "${RED}Warning: Launchpad container not found! Check docker logs.${NC}"
else
  echo -e "${GREEN}Launchpad container is running!${NC}"
fi

echo -e "\n${GREEN}${BOLD}INTEGRATION FIX COMPLETE!${NC}"
echo -e "${YELLOW}Access the services at:${NC}"
echo -e "  ${BLUE}Launchpad:${NC}                http://localhost:8000"
echo -e "  ${BLUE}Journey Mapper (Claude):${NC}   http://localhost:8080"
echo -e "  ${BLUE}Journey Mapper (o3):${NC}       http://localhost:8090"
echo -e "  ${BLUE}Journey Mapper (Claude 4):${NC}  http://localhost:8095"
echo -e "  ${BLUE}Reddit Ripper:${NC}            http://localhost:5001"
echo -e "  ${BLUE}Video Analyzer:${NC}           http://localhost:5002"
echo ""
echo -e "${YELLOW}You should now see the Claude 4 Journey Mapper in the launchpad interface at http://localhost:8000${NC}"
echo ""
echo -e "${YELLOW}If you still don't see the Claude 4 Journey Mapper in the launchpad, try:${NC}"
echo -e "  1. Clearing your browser cache or using an incognito window"
echo -e "  2. Checking the launchpad container logs: docker logs nxthumans_ai_cx_workbench-launchpad-1"
echo -e "  3. Checking the claude4-journey-mapper container logs: docker logs nxthumans_ai_cx_workbench-claude4-journey-mapper-1"
echo ""
echo -e "${GREEN}${BOLD}Enjoy using the NXT HUMANS AI CX WORKBENCH with Claude 4 Journey Mapper!${NC}"