#!/bin/bash

# NXT Humans Docker-only Launcher
# This script avoids all port detection and just forces Docker to use different ports

# Colors for terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "  _   ___  _______   _   _ _   _ __  __          _   _  _____ "
echo " | \\ | \\ \\/ /_   _| | | | | | | |  \\/  |   /\\   | \\ | |/ ____|"
echo " |  \\| |\\  /  | |   | |_| | | | | \\  / |  /  \\  |  \\| | (___  "
echo " | . \` | /  \\ | |   |  _  | | | | |\\/| | / /\\ \\ | . \` |\\___ \\ "
echo " | |\\  |/ /\\ \\| |   | | | | |_| | |  | |/ ____ \\| |\\  |____) |"
echo " |_| \\_/_/  \\_\\_|   |_| |_|\\___/|_|  |_/_/    \\_\\_| \\_|_____/ "
echo -e "${NC}"
echo -e "${YELLOW}AI Customer Experience Workbench${NC}"
echo ""

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Force stop any existing Docker containers
echo -e "${BLUE}Stopping any running containers...${NC}"
docker compose down 2>/dev/null || true
docker compose -f docker-compose.yml down 2>/dev/null || true

# Create a fixed compose file with specific ports
echo -e "${BLUE}Creating Docker configuration with non-standard ports...${NC}"

cat > docker-fixed.yml << EOL
services:
  launchpad:
    image: python:3.9-slim
    ports:
      - "9000:8000"
    environment:
      - JOURNEY_MAPPER_URL=http://localhost:9080
      - REDDIT_RIPPER_URL=http://localhost:9050
      - SOCIAL_RESEARCH_URL=http://localhost:9030
      - PORT=8000
    volumes:
      - ./launchpad:/app
    working_dir: /app
    command: >
      bash -c "pip install -r requirements.txt &&
              python app.py"
    networks:
      - nxt-humans-network

  journey-mapper:
    image: python:3.9-slim
    ports:
      - "9080:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_api_key_here}
      - PORT=8000
    volumes:
      - ./internal-solutions-journey-mapper:/app
    working_dir: /app
    command: >
      bash -c "pip install -r requirements.txt &&
              python run.py"
    networks:
      - nxt-humans-network

  reddit-ripper:
    image: python:3.9-slim
    ports:
      - "9050:5000"
    environment:
      - PORT=5000
    volumes:
      - ./internal-solutions-reddit-ripper:/app
    working_dir: /app
    command: >
      bash -c "pip install -r requirements.txt &&
              python app.py"
    networks:
      - nxt-humans-network

  social-research:
    image: node:16-slim
    ports:
      - "9030:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_api_key_here}
      - PORT=3000
    volumes:
      - ./internal-solutions-socialresearch:/app
    working_dir: /app/frontend
    command: >
      bash -c "npm install &&
              npm run dev --port=3000"
    networks:
      - nxt-humans-network

networks:
  nxt-humans-network:
    driver: bridge
EOL

# Start Docker with our fixed config
echo -e "${BLUE}Starting Docker containers with fixed ports...${NC}"
echo -e "${YELLOW}Please make sure Docker is running on your machine!${NC}"
docker compose -f docker-fixed.yml up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Docker failed to start containers${NC}"
    echo -e "${YELLOW}Make sure Docker Desktop is running and try again${NC}"
    exit 1
fi

# Wait a bit for containers to start
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 10

# Open browser
echo -e "${GREEN}Opening browser to launchpad...${NC}"
if [ "$(uname)" == "Darwin" ]; then  # macOS
    open "http://localhost:9000"
else
    echo -e "${YELLOW}Please open http://localhost:9000 in your browser${NC}"
fi

# Display URLs
echo ""
echo -e "${GREEN}NXT Humans AI CX Workbench is running with the following URLs:${NC}"
echo -e "${BLUE}Launchpad:${NC} http://localhost:9000"
echo -e "${BLUE}Journey Mapper:${NC} http://localhost:9080"
echo -e "${BLUE}Reddit Ripper:${NC} http://localhost:9050"
echo -e "${BLUE}Social Research:${NC} http://localhost:9030"
echo ""
echo -e "${YELLOW}To stop the workbench, run:${NC} docker compose -f docker-fixed.yml down"
echo ""