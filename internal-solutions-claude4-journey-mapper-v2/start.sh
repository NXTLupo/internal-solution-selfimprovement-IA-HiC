#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}AI Journey Mapper with Claude 3.7 (Simplified)${NC}"
echo "================================================="
echo ""

# Define the port
PORT=5000

# Kill any existing processes on all possible ports
APP_PORTS=("${PORT}" "8000" "3000")

# Function to check if a port is in use
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

# Function to kill processes on a port with retries
kill_processes_on_port() {
    local port=$1
    local max_attempts=3
    local attempt=1
    local killed=false
    
    echo -e "${YELLOW}Checking for processes on port ${port}...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if is_port_in_use "${port}"; then
            if command -v lsof &> /dev/null; then
                # For macOS and Linux
                PIDS=$(lsof -ti:"${port}" 2>/dev/null)
                if [ ! -z "$PIDS" ]; then
                    if [ $attempt -eq 1 ]; then
                        echo -e "${YELLOW}Attempt ${attempt}: Found process(es) on port ${port}. Sending SIGTERM...${NC}"
                        kill $PIDS 2>/dev/null
                    else
                        echo -e "${RED}Attempt ${attempt}: Port ${port} still in use. Sending SIGKILL...${NC}"
                        kill -9 $PIDS 2>/dev/null
                    fi
                    killed=true
                    sleep 2  # Give it a moment to terminate
                fi
            elif command -v netstat &> /dev/null && command -v findstr &> /dev/null; then
                # For Windows
                PIDS=$(netstat -ano | findstr :"${port}" | awk '{print $5}')
                if [ ! -z "$PIDS" ]; then
                    echo -e "${YELLOW}Attempt ${attempt}: Found processes on port ${port}. Killing them...${NC}"
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
                echo -e "${RED}Port ${port} still in use after attempt ${attempt}${NC}"
            fi
        else
            if [ $attempt -eq 1 ]; then
                echo -e "${GREEN}No processes found on port ${port}${NC}"
            fi
            return 0
        fi
        
        attempt=$((attempt+1))
    done
    
    if is_port_in_use "${port}"; then
        echo -e "${RED}WARNING: Failed to free port ${port} after ${max_attempts} attempts!${NC}"
        return 1
    fi
    
    return 0
}

echo -e "${YELLOW}Checking for existing processes on application ports...${NC}"
for p in "${APP_PORTS[@]}"; do
    kill_processes_on_port "$p"
done

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3 and try again.${NC}"
    exit 1
fi

# Check if required files exist
if [ ! -f "src/app.py" ] || [ ! -f "src/data_ingestion/data_processor.py" ] || [ ! -f "src/ai_analysis/dynamic_journey_mapper.py" ]; then
    echo -e "${RED}Missing required files. Please ensure the following files exist:${NC}"
    echo "1. src/app.py - Main FastAPI application"
    echo "2. src/data_ingestion/data_processor.py"
    echo "3. src/ai_analysis/dynamic_journey_mapper.py - Simplified journey mapper"
    exit 1
fi

# Set up directory structure
echo -e "${YELLOW}Setting up project structure...${NC}"
python3 setup.py

# Check if required packages are installed
echo -e "${YELLOW}Checking for required packages...${NC}"
python3 -c "
import sys
missing = []
for pkg in ['fastapi', 'uvicorn', 'pandas', 'requests']:
    try:
        __import__(pkg)
    except ImportError:
        missing.append(pkg)
if missing:
    print('Missing packages: ' + ', '.join(missing))
    sys.exit(1)
else:
    print('All required packages are installed.')
" || {
    echo -e "${RED}Missing required packages. Installing...${NC}"
    pip install fastapi uvicorn python-multipart pandas requests || {
        echo -e "${RED}Failed to install required packages. Please install them manually:${NC}"
        echo "pip install fastapi uvicorn python-multipart pandas requests"
        exit 1
    }
}

# Check for API key
DEFAULT_API_KEY="***REDACTED-ANTHROPIC-KEY***"

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}No Anthropic API key found in environment.${NC}"
    echo "Please enter your Anthropic API key (or press Enter to use the default key):"
    read -r API_KEY
    
    if [ -z "$API_KEY" ]; then
        echo -e "${YELLOW}Using default API key.${NC}"
        export ANTHROPIC_API_KEY="$DEFAULT_API_KEY"
    else
        export ANTHROPIC_API_KEY="$API_KEY"
    fi
else
    echo -e "${GREEN}Using Anthropic API key from environment.${NC}"
fi

# Set the model
export ANTHROPIC_MODEL="claude-3-7-sonnet-20250219"

# Create necessary directories
mkdir -p logs journey_maps uploads static templates/pages

# Start the application
echo -e "${GREEN}Starting AI Journey Mapper with Claude 3.7...${NC}"
echo "API Key: ${ANTHROPIC_API_KEY:0:10}...${ANTHROPIC_API_KEY:(-5)}"
echo "Model: $ANTHROPIC_MODEL"
echo "======================================================"
echo "Open your browser and go to: http://localhost:${PORT}"
echo "======================================================"

echo -e "${YELLOW}Attempting to start the application on port ${PORT}...${NC}"

# First, do a final check if the port is free
if is_port_in_use "${PORT}"; then
    echo -e "${RED}⚠️ WARNING: Port ${PORT} is still in use despite kill attempts!${NC}"
    echo -e "${YELLOW}Trying the force_kill_ports.sh script...${NC}"
    
    # Generate force_kill_ports.sh if it doesn't exist
    if [ ! -f "./force_kill_ports.sh" ]; then
        echo -e "${YELLOW}Creating emergency port killer script...${NC}"
        cat > force_kill_ports.sh << 'EOF'
#!/bin/bash
echo "EMERGENCY PORT KILLER"
echo "=============================="
echo "This script will aggressively kill ALL processes on ports 5000, 8000, and 3000"

for PORT in 5000 8000 3000; do
    echo "Aggressively killing ALL processes on port ${PORT}..."
    
    # For macOS/Linux
    if command -v lsof &> /dev/null; then
        PIDS=$(lsof -ti:${PORT} 2>/dev/null)
        if [ ! -z "$PIDS" ]; then
            echo "Found PIDs: $PIDS"
            echo "Sending SIGKILL..."
            kill -9 $PIDS 2>/dev/null
        fi
    fi
    
    # Use pkill to kill any process that might be related
    if command -v pkill &> /dev/null; then
        pkill -f "port.*${PORT}" 2>/dev/null
        pkill -f ".*:${PORT}" 2>/dev/null
    fi
    
    # Try sudo if available
    if command -v sudo &> /dev/null; then
        sudo lsof -i:${PORT} | grep LISTEN | awk '{print $2}' | xargs -r sudo kill -9 2>/dev/null
    fi
    
    echo "Port ${PORT} should now be free"
done

echo "Emergency port killing complete."
EOF
        chmod +x force_kill_ports.sh
    fi
    
    # Run the emergency script
    ./force_kill_ports.sh
    
    # Check again
    if is_port_in_use "${PORT}"; then
        echo -e "${RED}⚠️ CRITICAL ERROR: Port ${PORT} is still in use! Trying alternative port 3456${NC}"
        PORT=3456
    fi
fi

echo -e "${GREEN}Starting application on port ${PORT}...${NC}"

# Start with correct path
if command -v uvicorn &> /dev/null; then
    uvicorn src.app:app --host 0.0.0.0 --port ${PORT} --reload
else
    python3 -m uvicorn src.app:app --host 0.0.0.0 --port ${PORT} --reload
fi