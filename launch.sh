#!/bin/bash

# NXT Humans AI CX Workbench Launcher
# This script launches all components of the workbench using Docker Compose

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define the logo
print_logo() {
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
}

# Print the logo
print_logo

# Check if Docker is installed and running
echo -e "${BLUE}Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Please install Docker and try again.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}Docker is running.${NC}"

# Check if .env file exists and ANTHROPIC_API_KEY is set
ENV_FILE="$(dirname "$0")/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found.${NC}"
    echo -e "${BLUE}Creating new .env file...${NC}"
    
    # Ask for API key
    echo -e "${YELLOW}Please enter your Anthropic API key (required for Journey Mapper):${NC}"
    read -r API_KEY
    
    # Create .env file
    echo "ANTHROPIC_API_KEY=$API_KEY" > "$ENV_FILE"
    echo -e "${GREEN}.env file created.${NC}"
else
    # Check if ANTHROPIC_API_KEY is set
    if ! grep -q "ANTHROPIC_API_KEY=" "$ENV_FILE" || grep -q "ANTHROPIC_API_KEY=$" "$ENV_FILE" || grep -q "ANTHROPIC_API_KEY=your_api_key_here" "$ENV_FILE"; then
        echo -e "${YELLOW}Anthropic API key not found in .env file.${NC}"
        echo -e "${YELLOW}Please enter your Anthropic API key (required for Journey Mapper):${NC}"
        read -r API_KEY
        
        # Update .env file
        sed -i.bak "s/ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$API_KEY/g" "$ENV_FILE"
        if [ $? -ne 0 ]; then
            # macOS compatibility
            sed -i "" "s/ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$API_KEY/g" "$ENV_FILE"
        fi
        echo -e "${GREEN}API key updated in .env file.${NC}"
    fi
fi

# Start the services
echo -e "${BLUE}Starting NXT Humans AI CX Workbench...${NC}"
echo -e "${YELLOW}This may take a few minutes for the first run as Docker images are downloaded.${NC}"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# Start Docker Compose
cd "$SCRIPT_DIR"
docker compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start Docker Compose. See errors above.${NC}"
    exit 1
fi

echo -e "${GREEN}Services are starting...${NC}"
echo ""

# Give services time to start
echo -ne "${BLUE}Waiting for services to initialize"
for i in {1..10}; do
    echo -ne "."
    sleep 1
done
echo -e "${NC}"

# Open browser to launchpad
echo -e "${GREEN}Opening Launchpad in your default browser...${NC}"
LAUNCHPAD_PORT=$(grep "LAUNCHPAD_PORT" "$ENV_FILE" 2>/dev/null | cut -d= -f2)
if [ -z "$LAUNCHPAD_PORT" ]; then
    LAUNCHPAD_PORT=8000
fi

# Open browser based on OS
if [ "$(uname)" == "Darwin" ]; then
    # macOS
    open "http://localhost:$LAUNCHPAD_PORT"
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    # Linux
    xdg-open "http://localhost:$LAUNCHPAD_PORT" 2>/dev/null || \
    sensible-browser "http://localhost:$LAUNCHPAD_PORT" 2>/dev/null || \
    gio open "http://localhost:$LAUNCHPAD_PORT" 2>/dev/null || \
    echo -e "${YELLOW}Please open http://localhost:$LAUNCHPAD_PORT in your browser${NC}"
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ] || [ "$(expr substr $(uname -s) 1 10)" == "MINGW64_NT" ]; then
    # Windows
    start "http://localhost:$LAUNCHPAD_PORT" || \
    echo -e "${YELLOW}Please open http://localhost:$LAUNCHPAD_PORT in your browser${NC}"
else
    echo -e "${YELLOW}Please open http://localhost:$LAUNCHPAD_PORT in your browser${NC}"
fi

echo ""
echo -e "${GREEN}NXT Humans AI CX Workbench is now running!${NC}"
echo -e "${BLUE}Launchpad: ${NC}http://localhost:$LAUNCHPAD_PORT"
echo -e "${BLUE}Journey Mapper: ${NC}http://localhost:8080"
echo -e "${BLUE}Reddit Ripper: ${NC}http://localhost:5000"
echo -e "${BLUE}Social Research: ${NC}http://localhost:3000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Trap Ctrl+C
trap 'echo -e "\n${BLUE}Stopping services...${NC}"; docker compose down; echo -e "${GREEN}All services stopped.${NC}"; exit 0' INT

# Keep the script running
while true; do
    sleep 1
done