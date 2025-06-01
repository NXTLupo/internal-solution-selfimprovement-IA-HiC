#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}INSTALLING DEPENDENCIES FOR ALL SERVICES${NC}"
echo -e "${BLUE}======================================${NC}"

# Check Python installation
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}${BOLD}Error: Python not found. Please install Python 3.${NC}"
    exit 1
fi

# Install launchpad dependencies
echo -e "${YELLOW}Installing Launchpad dependencies...${NC}"
cd launchpad
$PYTHON_CMD -m pip install -r requirements.txt
cd ..

# Check if virtual environments exist, create if not
if [ ! -d "video_venv" ]; then
  echo -e "${YELLOW}Creating video virtual environment...${NC}"
  $PYTHON_CMD -m venv video_venv
fi

if [ ! -d "journey_venv" ]; then
  echo -e "${YELLOW}Creating journey virtual environment...${NC}"
  $PYTHON_CMD -m venv journey_venv
fi

if [ ! -d "reddit_venv" ]; then
  echo -e "${YELLOW}Creating Reddit virtual environment...${NC}"
  $PYTHON_CMD -m venv reddit_venv
fi

# Install Video Analyzer dependencies
echo -e "${YELLOW}Installing Video Analyzer dependencies...${NC}"
source video_venv/bin/activate
cd internal-solutions-video-analyzer
$PYTHON_CMD -m pip install -r requirements.txt
cd ..
deactivate

# Install Journey Mapper dependencies
echo -e "${YELLOW}Installing Journey Mapper dependencies...${NC}"
source journey_venv/bin/activate
cd internal-solutions-journeymapper
$PYTHON_CMD -m pip install -r requirements.txt
cd ..
deactivate

# Install Reddit Ripper dependencies
echo -e "${YELLOW}Installing Reddit Ripper dependencies...${NC}"
source reddit_venv/bin/activate
cd internal-solutions-reddit-ripper
$PYTHON_CMD -m pip install -r requirements.txt
cd ..
deactivate

echo -e "${GREEN}${BOLD}All dependencies have been installed!${NC}"
echo -e "${YELLOW}You can now run ./launch-everything.sh to start all services.${NC}"