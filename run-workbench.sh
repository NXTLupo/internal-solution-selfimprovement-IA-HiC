#!/bin/bash

# NXT Humans AI CX Workbench - Guaranteed Start Script
# This script ensures clean start by checking ports and stopping conflicting processes

# Colors for output
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

# Get directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# First, make sure all Docker containers are stopped
echo -e "${BLUE}Stopping any existing containers...${NC}"
docker compose down 2>/dev/null
docker compose -f dynamic-compose.yml down 2>/dev/null

# Force kill any processes using our standard ports
echo -e "${BLUE}Checking for processes using our ports...${NC}"

# Function to kill process on port
kill_process_on_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Found process (PID: $pid) using port $port. Stopping it...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Check common ports we use
kill_process_on_port 8000
kill_process_on_port 8080
kill_process_on_port 5000
kill_process_on_port 5001
kill_process_on_port 3000

# Setup our ports in .env
echo -e "${BLUE}Setting up port configuration...${NC}"

# Define default ports with alternates if defaults are taken
LAUNCHPAD_DEFAULT_PORT=8000
LAUNCHPAD_ALT_PORT=9000

JOURNEY_MAPPER_DEFAULT_PORT=8080
JOURNEY_MAPPER_ALT_PORT=9080

REDDIT_RIPPER_DEFAULT_PORT=5001  # Changed from 5000 to avoid common conflicts
REDDIT_RIPPER_ALT_PORT=6001

SOCIAL_RESEARCH_DEFAULT_PORT=3000
SOCIAL_RESEARCH_ALT_PORT=4000

# Function to check if a port is truly available
is_port_free() {
    local port=$1
    # Try multiple methods
    if command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            return 1  # Port is in use
        fi
    fi
    
    # Try socket test as well
    (echo > /dev/tcp/127.0.0.1/$port) 2>/dev/null
    if [ $? -eq 0 ]; then
        return 1  # Port is in use
    fi
    
    return 0  # Port is free
}

# Choose ports based on availability
choose_port() {
    local default_port=$1
    local alt_port=$2
    local name=$3
    
    if is_port_free $default_port; then
        echo -e "${GREEN}Using default port $default_port for $name${NC}" >&2
        echo "$default_port"
    elif is_port_free $alt_port; then
        echo -e "${YELLOW}Default port $default_port is in use. Using alternate port $alt_port for $name${NC}" >&2
        echo "$alt_port"
    else
        # Find a random available port in range 7000-9000
        local test_port
        for test_port in $(seq 7000 9000); do
            if is_port_free $test_port; then
                echo -e "${YELLOW}Using random port $test_port for $name (default and alternate unavailable)${NC}" >&2
                echo "$test_port"
                return
            fi
        done
        
        # If we get here, we're in trouble
        echo -e "${RED}Could not find any available port for $name!${NC}" >&2
        echo "0"  # Return 0 as error
    fi
}

# Set our ports
LAUNCHPAD_PORT=$(choose_port $LAUNCHPAD_DEFAULT_PORT $LAUNCHPAD_ALT_PORT "Launchpad")
JOURNEY_MAPPER_PORT=$(choose_port $JOURNEY_MAPPER_DEFAULT_PORT $JOURNEY_MAPPER_ALT_PORT "Journey Mapper")
REDDIT_RIPPER_PORT=$(choose_port $REDDIT_RIPPER_DEFAULT_PORT $REDDIT_RIPPER_ALT_PORT "Reddit Ripper")
SOCIAL_RESEARCH_PORT=$(choose_port $SOCIAL_RESEARCH_DEFAULT_PORT $SOCIAL_RESEARCH_ALT_PORT "Social Research")

# Check if any port returned 0 (error)
if [[ $LAUNCHPAD_PORT -eq 0 || $JOURNEY_MAPPER_PORT -eq 0 || $REDDIT_RIPPER_PORT -eq 0 || $SOCIAL_RESEARCH_PORT -eq 0 ]]; then
    echo -e "${RED}Port allocation failed. Please check for processes using too many ports.${NC}"
    exit 1
fi

# Update .env file with our chosen ports
cat > .env << EOL
# Environment variables for NXT Humans AI CX Workbench
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_api_key_here}

# Port configurations - Dynamically allocated
LAUNCHPAD_PORT=$LAUNCHPAD_PORT
JOURNEY_MAPPER_PORT=$JOURNEY_MAPPER_PORT
REDDIT_RIPPER_PORT=$REDDIT_RIPPER_PORT
SOCIAL_RESEARCH_PORT=$SOCIAL_RESEARCH_PORT
EOL

echo -e "${GREEN}Environment configuration updated with chosen ports.${NC}"

# Start the services with Docker Compose
echo -e "${BLUE}Starting NXT Humans AI CX Workbench...${NC}"
echo -e "${YELLOW}This may take a few minutes on first run.${NC}"

# Run Docker Compose with our dynamic compose file
docker compose -f dynamic-compose.yml up -d

# Wait for services to start
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 10

# Open browser
echo -e "${GREEN}Opening workbench in your browser...${NC}"
if [ "$(uname)" == "Darwin" ]; then  # macOS
    open "http://localhost:$LAUNCHPAD_PORT"
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then  # Linux
    if [ -n "$BROWSER" ]; then
        $BROWSER "http://localhost:$LAUNCHPAD_PORT"
    elif which xdg-open > /dev/null; then
        xdg-open "http://localhost:$LAUNCHPAD_PORT"
    elif which gnome-open > /dev/null; then
        gnome-open "http://localhost:$LAUNCHPAD_PORT"
    else
        echo -e "${YELLOW}Please open http://localhost:$LAUNCHPAD_PORT in your browser${NC}"
    fi
else  # Windows with Git Bash
    start "http://localhost:$LAUNCHPAD_PORT" || echo -e "${YELLOW}Please open http://localhost:$LAUNCHPAD_PORT in your browser${NC}"
fi

# Display service URLs
echo ""
echo -e "${GREEN}NXT Humans AI CX Workbench is now running!${NC}"
echo -e "${BLUE}Launchpad: ${NC}http://localhost:$LAUNCHPAD_PORT"
echo -e "${BLUE}Journey Mapper: ${NC}http://localhost:$JOURNEY_MAPPER_PORT"
echo -e "${BLUE}Reddit Ripper: ${NC}http://localhost:$REDDIT_RIPPER_PORT"
echo -e "${BLUE}Social Research: ${NC}http://localhost:$SOCIAL_RESEARCH_PORT"
echo ""
echo -e "${YELLOW}To stop the workbench, run:${NC} docker compose -f dynamic-compose.yml down"
echo ""