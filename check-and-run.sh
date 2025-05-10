#!/bin/bash

# NXT Humans AI CX Workbench - Safe Startup Script
# This script checks Docker, port availability, and starts services

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_banner() {
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

# Get directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

print_banner

# Check if Docker is running
echo -e "${BLUE}Checking Docker status...${NC}"
docker info > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Docker is not running! Starting the workbench without Docker.${NC}"
    echo -e "${YELLOW}We'll try to launch services directly on your machine.${NC}"
    echo ""
    
    # Check if Python is installed
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo -e "${RED}Error: Neither python3 nor python is available. Cannot start services.${NC}"
        echo -e "${YELLOW}Please install Python 3.9+ or start Docker and try again.${NC}"
        exit 1
    fi
    
    # Function to check if a port is available
    is_port_free() {
        local port=$1
        if command -v lsof &> /dev/null; then
            lsof -i :$port &> /dev/null
            if [ $? -ne 0 ]; then
                return 0  # Port is available
            fi
        else
            # Try socket test
            (echo > /dev/tcp/127.0.0.1/$port) 2>/dev/null
            if [ $? -ne 0 ]; then
                return 0  # Port is available
            fi
        fi
        return 1  # Port is in use
    }
    
    # Find available ports for each service
    find_available_port() {
        local start_port=$1
        local port=$start_port
        
        while ! is_port_free $port; do
            port=$((port + 1))
            if [ $((port - start_port)) -gt 100 ]; then
                echo 0
                return
            fi
        done
        
        echo $port
    }
    
    LAUNCHPAD_PORT=$(find_available_port 8000)
    JOURNEY_MAPPER_PORT=$(find_available_port 8080)
    REDDIT_RIPPER_PORT=$(find_available_port 5001)
    SOCIAL_RESEARCH_PORT=$(find_available_port 3000)
    
    # Update .env file
    cat > .env << EOL
# Environment variables for NXT Humans AI CX Workbench
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_api_key_here}

# Port configurations - Dynamically allocated
LAUNCHPAD_PORT=$LAUNCHPAD_PORT
JOURNEY_MAPPER_PORT=$JOURNEY_MAPPER_PORT
REDDIT_RIPPER_PORT=$REDDIT_RIPPER_PORT
SOCIAL_RESEARCH_PORT=$SOCIAL_RESEARCH_PORT
EOL
    
    # Try to launch services directly
    echo -e "${BLUE}Attempting to start Launchpad service on port $LAUNCHPAD_PORT...${NC}"
    
    # Setup environment variables for the Launchpad
    export JOURNEY_MAPPER_URL="http://localhost:$JOURNEY_MAPPER_PORT"
    export REDDIT_RIPPER_URL="http://localhost:$REDDIT_RIPPER_PORT"
    export SOCIAL_RESEARCH_URL="http://localhost:$SOCIAL_RESEARCH_PORT"
    export PORT=$LAUNCHPAD_PORT
    
    # Start Launchpad in the background
    cd "$DIR/launchpad"
    $PYTHON_CMD -m pip install -r requirements.txt > /dev/null 2>&1
    $PYTHON_CMD app.py &
    LAUNCHPAD_PID=$!
    cd "$DIR"
    
    # Wait a moment for the server to start
    sleep 2
    
    # Check if the service started successfully
    if kill -0 $LAUNCHPAD_PID 2>/dev/null; then
        echo -e "${GREEN}Launchpad service started successfully on port $LAUNCHPAD_PORT${NC}"
        
        # Try to open a browser
        echo -e "${BLUE}Opening browser to Launchpad...${NC}"
        if [ "$(uname)" == "Darwin" ]; then  # macOS
            open "http://localhost:$LAUNCHPAD_PORT"
        elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then  # Linux
            if which xdg-open > /dev/null; then
                xdg-open "http://localhost:$LAUNCHPAD_PORT"
            else
                echo -e "${YELLOW}Please open http://localhost:$LAUNCHPAD_PORT in your browser${NC}"
            fi
        else  # Windows
            start "http://localhost:$LAUNCHPAD_PORT" 2>/dev/null || echo -e "${YELLOW}Please open http://localhost:$LAUNCHPAD_PORT in your browser${NC}"
        fi
        
        # Display information about running services
        echo ""
        echo -e "${GREEN}Launchpad is running at:${NC} http://localhost:$LAUNCHPAD_PORT"
        echo ""
        echo -e "${YELLOW}NOTE:${NC} Other services (Journey Mapper, Reddit Ripper, Social Research) need to be"
        echo -e "started manually or using Docker. This script only starts the Launchpad."
        echo ""
        echo -e "${BLUE}To stop the Launchpad service, press Ctrl+C${NC}"
        
        # Wait for Ctrl+C
        wait $LAUNCHPAD_PID
    else
        echo -e "${RED}Failed to start Launchpad service. Check for errors.${NC}"
        echo -e "${YELLOW}Try starting Docker and running the script again.${NC}"
        exit 1
    fi
    
else
    # Docker is running, proceed with Docker Compose
    echo -e "${GREEN}Docker is running.${NC}"
    
    # Stop any existing containers
    echo -e "${BLUE}Stopping any existing containers...${NC}"
    docker compose down 2>/dev/null
    docker compose -f dynamic-compose.yml down 2>/dev/null
    
    # Check for port conflicts
    echo -e "${BLUE}Checking for port conflicts...${NC}"
    
    check_and_kill_port() {
        local port=$1
        local pid=$(lsof -ti:$port 2>/dev/null)
        
        if [ -n "$pid" ]; then
            echo -e "${YELLOW}Found process (PID: $pid) using port $port. Stopping it...${NC}"
            kill -9 $pid 2>/dev/null
            sleep 1
        fi
    }
    
    # Check common ports
    check_and_kill_port 8000
    check_and_kill_port 8080
    check_and_kill_port 5000
    check_and_kill_port 5001
    check_and_kill_port 3000
    
    # Setup port configuration in .env
    echo -e "${BLUE}Setting up port configuration...${NC}"
    cat > .env << EOL
# Environment variables for NXT Humans AI CX Workbench
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-your_api_key_here}

# Port configurations - Dynamically allocated
LAUNCHPAD_PORT=8000
JOURNEY_MAPPER_PORT=8080
REDDIT_RIPPER_PORT=5001
SOCIAL_RESEARCH_PORT=3000
EOL
    
    # Start the services
    echo -e "${BLUE}Starting NXT Humans AI CX Workbench...${NC}"
    echo -e "${YELLOW}This may take a few minutes on first run.${NC}"
    
    # Run Docker Compose with our dynamic compose file
    docker compose -f dynamic-compose.yml up -d
    
    # Check if the containers started successfully
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Container services started successfully.${NC}"
        
        # Wait for services to start
        echo -e "${BLUE}Waiting for services to start...${NC}"
        sleep 10
        
        # Open browser
        echo -e "${GREEN}Opening workbench in your browser...${NC}"
        if [ "$(uname)" == "Darwin" ]; then  # macOS
            open "http://localhost:8000"
        elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then  # Linux
            if [ -n "$BROWSER" ]; then
                $BROWSER "http://localhost:8000"
            elif which xdg-open > /dev/null; then
                xdg-open "http://localhost:8000"
            else
                echo -e "${YELLOW}Please open http://localhost:8000 in your browser${NC}"
            fi
        else  # Windows
            start "http://localhost:8000" 2>/dev/null || echo -e "${YELLOW}Please open http://localhost:8000 in your browser${NC}"
        fi
        
        # Display service URLs
        echo ""
        echo -e "${GREEN}NXT Humans AI CX Workbench is now running!${NC}"
        echo -e "${BLUE}Launchpad: ${NC}http://localhost:8000"
        echo -e "${BLUE}Journey Mapper: ${NC}http://localhost:8080"
        echo -e "${BLUE}Reddit Ripper: ${NC}http://localhost:5001"
        echo -e "${BLUE}Social Research: ${NC}http://localhost:3000"
        echo ""
        echo -e "${YELLOW}To stop the workbench, run:${NC} docker compose -f dynamic-compose.yml down"
        echo ""
    else
        echo -e "${RED}Failed to start Docker containers. Check Docker logs for details.${NC}"
        echo -e "${YELLOW}You can try running without Docker:${NC} python launchpad/app.py"
    fi
fi