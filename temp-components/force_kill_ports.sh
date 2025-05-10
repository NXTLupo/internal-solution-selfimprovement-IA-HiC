#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define the ports to kill
PORTS=(5000 8000 3000)

echo -e "${RED}EMERGENCY PORT KILLER${NC}"
echo "=============================="
echo -e "${YELLOW}This script will aggressively kill ALL processes on ports 5000, 8000, and 3000${NC}"
echo -e "${YELLOW}Use this script when normal killing methods fail${NC}"
echo ""

for PORT in "${PORTS[@]}"; do
    echo -e "${RED}Aggressively killing ALL processes on port ${PORT}...${NC}"
    
    # Method 1: lsof + kill -9 (for macOS/Linux)
    if command -v lsof &> /dev/null; then
        PIDS=$(lsof -ti:${PORT} 2>/dev/null)
        if [ ! -z "$PIDS" ]; then
            echo -e "Found PIDs: $PIDS"
            echo -e "Sending SIGKILL..."
            kill -9 $PIDS 2>/dev/null
            sleep 2
        fi
    fi
    
    # Method 2: Use alternate lsof syntax (for macOS/Linux)
    if command -v lsof &> /dev/null; then
        lsof -i:${PORT} 2>/dev/null | grep LISTEN | awk '{print $2}' | xargs -r kill -9 2>/dev/null
        sleep 1
    fi
    
    # Method 3: fuser (for Linux)
    if command -v fuser &> /dev/null; then
        echo "Using fuser to kill processes..."
        fuser -k -n tcp ${PORT} 2>/dev/null
        sleep 1
    fi
    
    # Method 4: netstat + kill (for both platforms)
    if command -v netstat &> /dev/null; then
        echo "Using netstat to find processes..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            netstat -anv | grep LISTEN | grep ".${PORT} " | awk '{print $9}' | xargs -r kill -9 2>/dev/null
        else
            # Linux and others
            netstat -tunlp 2>/dev/null | grep ":${PORT} " | awk '{print $7}' | cut -d'/' -f1 | xargs -r kill -9 2>/dev/null
        fi
        sleep 1
    fi
    
    # Method 5: pkill related processes
    if command -v pkill &> /dev/null; then
        echo "Using pkill to kill related processes..."
        pkill -f "port.*${PORT}" 2>/dev/null
        pkill -f ".*:${PORT}" 2>/dev/null
        pkill -f "listen.*${PORT}" 2>/dev/null
        sleep 1
    fi
    
    # Method 6: For macOS specifically
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Using macOS specific commands..."
        # Use sudo if available (will prompt for password)
        if command -v sudo &> /dev/null; then
            echo "Attempting sudo kill (may prompt for password)..."
            sudo lsof -i:${PORT} | grep LISTEN | awk '{print $2}' | xargs -r sudo kill -9 2>/dev/null
            sleep 1
        fi
    fi
    
    # Final check
    if command -v lsof &> /dev/null && lsof -i:${PORT} &>/dev/null; then
        echo -e "${RED}❌ WARNING: Port ${PORT} is STILL in use after aggressive attempts!${NC}"
        echo "You may need to restart your computer to free this port."
    else
        echo -e "${GREEN}✓ Port ${PORT} is now free${NC}"
    fi
    
    echo ""
done

echo -e "${GREEN}Emergency port killing complete.${NC}"
echo "Now try running your application again."