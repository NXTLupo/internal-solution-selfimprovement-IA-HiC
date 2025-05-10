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

# Stop containers from both compose files to be safe
docker compose down 2>/dev/null
docker compose -f dynamic-compose.yml down

echo -e "${GREEN}All services stopped successfully.${NC}"