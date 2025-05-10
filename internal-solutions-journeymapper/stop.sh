#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping all AI Journey Mapper processes...${NC}"

# Define application ports
APP_PORTS=(5000 8000 3000)

# Kill by PID file if it exists
if [ -f .running_pids ]; then
    echo "Found PID file, stopping processes..."
    kill $(cat .running_pids) 2>/dev/null || echo "Processes already stopped"
    rm .running_pids
fi

# Kill all possible processes to be thorough
echo "Checking for any other related processes..."

# Kill uvicorn processes
pgrep -f "uvicorn app:app" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Found uvicorn processes, killing them..."
    pkill -f "uvicorn app:app" || echo "No uvicorn processes to kill"
fi

# Kill webpack processes
pgrep -f "webpack" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Found webpack processes, killing them..."
    pkill -f "webpack" || echo "No webpack processes to kill"
fi

# Function to check if a port is in use (same as in start.sh)
is_port_in_use() {
    local port=$1
    if command -v lsof &> /dev/null; then
        # For macOS and Linux
        lsof -i:"${port}" >/dev/null 2>&1
        return $?
    elif command -v netstat &> /dev/null; then
        # For Windows
        netstat -ano | grep ":${port}" >/dev/null 2>&1
        return $?
    else
        # Can't check
        return 1
    fi
}

# Function to kill processes on a port with verification (same as in start.sh but with more aggressive killing)
kill_processes_on_port() {
    local port=$1
    local max_attempts=3
    local attempt=1
    local killed=false
    
    echo -e "${YELLOW}Checking for processes on port ${port}...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if is_port_in_use "${port}"; then
            if command -v lsof &> /dev/null; then
                # For macOS and Linux - be more aggressive, use SIGKILL immediately
                PIDS=$(lsof -ti:"${port}" 2>/dev/null)
                if [ ! -z "$PIDS" ]; then
                    echo -e "${RED}Attempt ${attempt}: Found process(es) on port ${port}. Sending SIGKILL...${NC}"
                    kill -9 $PIDS 2>/dev/null
                    killed=true
                    sleep 2  # Give it a moment to terminate
                fi
            elif command -v netstat &> /dev/null && command -v findstr &> /dev/null; then
                # For Windows - always use force kill
                PIDS=$(netstat -ano | findstr :"${port}" | awk '{print $5}')
                if [ ! -z "$PIDS" ]; then
                    echo -e "${RED}Attempt ${attempt}: Found processes on port ${port}. Force killing them...${NC}"
                    for PID in $PIDS; do
                        taskkill /F /PID $PID 2>/dev/null
                    done
                    killed=true
                    sleep 2  # Give it a moment to terminate
                fi
            fi
            
            # Check if port is now free
            if ! is_port_in_use "${port}"; then
                echo -e "${GREEN}Successfully freed port ${port} on attempt ${attempt}${NC}"
                return 0
            else
                echo -e "${RED}Port ${port} still in use after attempt ${attempt} - trying again${NC}"
            fi
        else
            if [ $attempt -eq 1 ]; then
                echo -e "${GREEN}No processes found on port ${port}${NC}"
            else
                echo -e "${GREEN}Port ${port} is now free${NC}"
            fi
            return 0
        fi
        
        attempt=$((attempt+1))
    done
    
    if is_port_in_use "${port}"; then
        echo -e "${RED}⚠️ WARNING: Failed to free port ${port} after ${max_attempts} attempts!${NC}"
        
        # Last resort - more aggressive approach for Linux/macOS
        if command -v lsof &> /dev/null && command -v pkill &> /dev/null; then
            echo -e "${RED}Attempting last resort methods to kill processes on port ${port}...${NC}"
            
            # Use pkill to kill any process that might be related
            pkill -f "port.*${port}" 2>/dev/null
            pkill -f ".*:${port}" 2>/dev/null
            
            # Find process in a different way and kill it
            PIDS=$(lsof -ti:"${port}" 2>/dev/null)
            if [ ! -z "$PIDS" ]; then
                echo -e "${RED}Final attempt: Killing with extreme prejudice: $PIDS${NC}"
                kill -9 $PIDS 2>/dev/null
                sleep 3
            fi
            
            # Check if we succeeded
            if ! is_port_in_use "${port}"; then
                echo -e "${GREEN}Last resort succeeded! Port ${port} is now free${NC}"
                return 0
            else
                echo -e "${RED}⚠️ CRITICAL ERROR: Port ${port} is still in use. Manual intervention required.${NC}"
            fi
        fi
        
        return 1
    fi
    
    return 0
}

# Check for processes on all relevant ports
echo -e "${YELLOW}Aggressively terminating all processes on application ports...${NC}"
for p in "${APP_PORTS[@]}"; do
    kill_processes_on_port "$p"
done

echo -e "${GREEN}All AI Journey Mapper processes have been stopped.${NC}"