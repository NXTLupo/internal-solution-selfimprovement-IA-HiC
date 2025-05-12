#!/bin/bash

# NXT Humans AI CX Workbench - Stop Script
# This script properly stops all services

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo -e "${BLUE}Stopping NXT Humans AI CX Workbench...${NC}"

# Stop containers from each compose file
echo -e "${YELLOW}Stopping containers from docker-compose.yml...${NC}"
docker compose down 2>/dev/null

echo -e "${YELLOW}Stopping containers from dynamic-compose.yml...${NC}"
docker compose -f dynamic-compose.yml down 2>/dev/null

echo -e "${YELLOW}Stopping containers from docker-compose-agent.yml...${NC}"
docker compose -f docker-compose-agent.yml down 2>/dev/null

# Find and stop any remaining containers with our project name
echo -e "${YELLOW}Checking for any remaining containers...${NC}"
REMAINING_CONTAINERS=$(docker ps -a --filter "name=nxthumans_ai_cx_workbench" --format "{{.ID}}")

if [ -n "$REMAINING_CONTAINERS" ]; then
    echo -e "${YELLOW}Stopping and removing remaining workbench containers...${NC}"
    echo $REMAINING_CONTAINERS | xargs docker stop
    echo $REMAINING_CONTAINERS | xargs docker rm
fi

# Clean up any lingering networks
echo -e "${YELLOW}Cleaning up networks...${NC}"
docker network rm nxthumans_ai_cx_workbench_nxt-humans-network 2>/dev/null
docker network prune -f

echo -e "${GREEN}All services stopped successfully.${NC}"
echo -e "${GREEN}To restart the workbench, run ./check-and-run.sh${NC}"