#!/bin/bash

# NXT Humans AI CX Workbench Quick Launcher
# This script starts the workbench using Docker Compose without any complex checks

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

# Function to check if a port is available
is_port_available() {
    local port=$1
    
    # Try multiple methods to check port availability
    # First try lsof (most reliable on macOS)
    if command -v lsof &> /dev/null; then
        lsof -i :$port &> /dev/null
        if [ $? -ne 0 ]; then
            # Double-check with socket test
            (echo > /dev/tcp/127.0.0.1/$port) 2>/dev/null
            if [ $? -ne 0 ]; then
                return 0  # Port is available
            else
                return 1  # Port is in use
            fi
        else
            return 1  # Port is in use according to lsof
        fi
    # If lsof not available, try netcat
    elif command -v nc &> /dev/null; then
        nc -z localhost $port &> /dev/null
        if [ $? -ne 0 ]; then
            return 0  # Port is available
        else
            return 1  # Port is in use
        fi
    # Last resort: try a direct socket connection
    else
        (echo > /dev/tcp/127.0.0.1/$port) 2>/dev/null
        if [ $? -ne 0 ]; then
            return 0  # Port is available
        else
            return 1  # Port is in use
        fi
    fi
}

# Function to find an available port starting from the given port
find_available_port() {
    local start_port=$1
    local service_name=$2
    local port=$start_port
    
    echo -e "${BLUE}Checking availability of port $port for $service_name...${NC}"
    
    while ! is_port_available $port; do
        echo -e "${YELLOW}Port $port is in use, trying the next port for $service_name...${NC}"
        port=$((port + 1))
        
        # Prevent infinite loop if somehow all ports are taken
        if [ $((port - start_port)) -gt 100 ]; then
            echo -e "${RED}Could not find an available port after checking 100 ports starting from $start_port for $service_name${NC}"
            return $start_port
        fi
    done
    
    if [ $port -eq $start_port ]; then
        echo -e "${GREEN}Using default port $port for $service_name${NC}"
    else
        echo -e "${GREEN}Assigned dynamic port $port for $service_name (default was $start_port)${NC}"
    fi
    
    echo $port
}

# Check for .env file and create if needed
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating one...${NC}"
    
    # Ask for Anthropic API key
    echo -e "${BLUE}Please enter your Anthropic API key (needed for Journey Mapper):${NC}"
    read -r API_KEY
    
    # Create .env file with default empty values
    cat > .env << EOL
# Environment variables for NXT Humans AI CX Workbench
ANTHROPIC_API_KEY=$API_KEY

# Default ports will be dynamically assigned if these are commented out
# LAUNCHPAD_PORT=8000
# JOURNEY_MAPPER_PORT=8080
# REDDIT_RIPPER_PORT=5000
# SOCIAL_RESEARCH_PORT=3000
EOL
    echo -e "${GREEN}.env file created successfully.${NC}"
fi

# Find available ports and update .env if needed
echo -e "${BLUE}Checking for available ports...${NC}"

# Parse current port values from .env file or use defaults
LAUNCHPAD_PORT=$(grep -E '^LAUNCHPAD_PORT=' .env 2>/dev/null | cut -d= -f2)
JOURNEY_MAPPER_PORT=$(grep -E '^JOURNEY_MAPPER_PORT=' .env 2>/dev/null | cut -d= -f2)
REDDIT_RIPPER_PORT=$(grep -E '^REDDIT_RIPPER_PORT=' .env 2>/dev/null | cut -d= -f2)
SOCIAL_RESEARCH_PORT=$(grep -E '^SOCIAL_RESEARCH_PORT=' .env 2>/dev/null | cut -d= -f2)

# Set default ports if not defined
LAUNCHPAD_PORT=${LAUNCHPAD_PORT:-8000}
JOURNEY_MAPPER_PORT=${JOURNEY_MAPPER_PORT:-8080}
REDDIT_RIPPER_PORT=${REDDIT_RIPPER_PORT:-5000}
SOCIAL_RESEARCH_PORT=${SOCIAL_RESEARCH_PORT:-3000}

# Check ports and find alternatives if needed
echo -e "${BLUE}Finding available ports for services...${NC}"
LAUNCHPAD_PORT=$(find_available_port $LAUNCHPAD_PORT "Launchpad")
JOURNEY_MAPPER_PORT=$(find_available_port $JOURNEY_MAPPER_PORT "Journey Mapper")
REDDIT_RIPPER_PORT=$(find_available_port $REDDIT_RIPPER_PORT "Reddit Ripper")
SOCIAL_RESEARCH_PORT=$(find_available_port $SOCIAL_RESEARCH_PORT "Social Research")

# Update or add port variables to .env file
sed -i.bak -E "s/^LAUNCHPAD_PORT=.*/LAUNCHPAD_PORT=$LAUNCHPAD_PORT/" .env || sed -i "" -E "s/^LAUNCHPAD_PORT=.*/LAUNCHPAD_PORT=$LAUNCHPAD_PORT/" .env 2>/dev/null
sed -i.bak -E "s/^JOURNEY_MAPPER_PORT=.*/JOURNEY_MAPPER_PORT=$JOURNEY_MAPPER_PORT/" .env || sed -i "" -E "s/^JOURNEY_MAPPER_PORT=.*/JOURNEY_MAPPER_PORT=$JOURNEY_MAPPER_PORT/" .env 2>/dev/null
sed -i.bak -E "s/^REDDIT_RIPPER_PORT=.*/REDDIT_RIPPER_PORT=$REDDIT_RIPPER_PORT/" .env || sed -i "" -E "s/^REDDIT_RIPPER_PORT=.*/REDDIT_RIPPER_PORT=$REDDIT_RIPPER_PORT/" .env 2>/dev/null
sed -i.bak -E "s/^SOCIAL_RESEARCH_PORT=.*/SOCIAL_RESEARCH_PORT=$SOCIAL_RESEARCH_PORT/" .env || sed -i "" -E "s/^SOCIAL_RESEARCH_PORT=.*/SOCIAL_RESEARCH_PORT=$SOCIAL_RESEARCH_PORT/" .env 2>/dev/null

# If the variables don't exist, add them
if ! grep -q "^LAUNCHPAD_PORT=" .env; then
    echo "LAUNCHPAD_PORT=$LAUNCHPAD_PORT" >> .env
fi
if ! grep -q "^JOURNEY_MAPPER_PORT=" .env; then
    echo "JOURNEY_MAPPER_PORT=$JOURNEY_MAPPER_PORT" >> .env
fi
if ! grep -q "^REDDIT_RIPPER_PORT=" .env; then
    echo "REDDIT_RIPPER_PORT=$REDDIT_RIPPER_PORT" >> .env
fi
if ! grep -q "^SOCIAL_RESEARCH_PORT=" .env; then
    echo "SOCIAL_RESEARCH_PORT=$SOCIAL_RESEARCH_PORT" >> .env
fi

# Clean up backup files
rm -f .env.bak

# Start the services with Docker Compose
echo -e "${BLUE}Starting NXT Humans AI CX Workbench...${NC}"
echo -e "${YELLOW}This may take a few minutes on first run.${NC}"

# Run Docker Compose with our dynamic-compose.yml file
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
echo -e "${YELLOW}To stop the workbench, run:${NC} docker compose down"
echo ""