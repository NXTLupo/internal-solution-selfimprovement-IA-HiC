#!/bin/bash
set -e

echo "========================================================================="
echo "             Restarting AI Journey Mapper Frontend & Backend             "
echo "========================================================================="

# Kill any existing instances of the app to prevent port conflicts
kill_existing_processes() {
    echo "Checking for existing processes..."
    
    # Find and kill any running uvicorn processes for our app
    pgrep -f "uvicorn app:app" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Found existing uvicorn processes. Killing them..."
        pkill -f "uvicorn app:app" > /dev/null 2>&1 || true
        # Give processes time to terminate
        sleep 2
    else
        echo "No existing uvicorn processes found."
    fi
    
    # Also check for the app running from the src directory
    pgrep -f "uvicorn src.app:app" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Found existing app processes in src directory. Killing them..."
        pkill -f "uvicorn src.app:app" > /dev/null 2>&1 || true
        sleep 2
    fi
    
    # Check for any webpack dev server processes
    pgrep -f "webpack" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Found webpack processes. Killing them..."
        pkill -f "webpack" > /dev/null 2>&1 || true
        sleep 2
    fi
    
    # Check if port 8000 is in use and kill the process
    if command -v lsof > /dev/null 2>&1; then
        if lsof -i:8000 > /dev/null 2>&1; then
            echo "Port 8000 is in use. Killing the process..."
            # Get PID and kill it, ignoring errors
            PID=$(lsof -i:8000 -t 2>/dev/null)
            if [ ! -z "$PID" ]; then
                kill -9 $PID > /dev/null 2>&1 || true
                echo "Killed process $PID on port 8000"
                sleep 2
            fi
        else
            echo "Port 8000 is free."
        fi
    else
        echo "lsof command not available, skipping port check"
    fi
    
    # Check if port 3000 is in use and kill the process
    if command -v lsof > /dev/null 2>&1; then
        if lsof -i:3000 > /dev/null 2>&1; then
            echo "Port 3000 is in use. Killing the process..."
            # Get PID and kill it, ignoring errors
            PID=$(lsof -i:3000 -t 2>/dev/null)
            if [ ! -z "$PID" ]; then
                kill -9 $PID > /dev/null 2>&1 || true
                echo "Killed process $PID on port 3000"
                sleep 2
            fi
        else
            echo "Port 3000 is free."
        fi
    else
        echo "lsof command not available, skipping port check"
    fi
    
    echo "Process cleanup completed."
}

# Run the cleanup function with error handling
set +e  # Temporarily disable strict error checking for the cleanup
kill_existing_processes
set -e  # Re-enable strict error checking

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "Ollama is not running. Starting Ollama..."
    ollama serve &
    echo "Waiting for Ollama to start..."
    sleep 10  # Give Ollama more time to start up
else
    echo "Ollama is already running."
fi

# Check if the model exists
MODEL_STATUS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"gemma:latest"' || echo "")
if [ -z "$MODEL_STATUS" ]; then
    echo "Model 'gemma:latest' not found in Ollama. Pulling model..."
    ollama pull gemma:latest
else
    echo "Gemma model is already available."
fi

# Set environment variables
export OLLAMA_API_URL=http://localhost:11434/api/generate
export OLLAMA_MODEL=gemma:latest

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p uploads journey_maps logs static/js static/css

# Check for Python virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Build the frontend
echo "Building frontend..."
npm ci  # Clean install to ensure consistency
npm run build

# Run backend and frontend in separate terminal windows
echo "Starting backend server..."
osascript -e 'tell app "Terminal" to do script "cd \"'$PWD'\" && source venv/bin/activate && cd src && uvicorn app:app --host 0.0.0.0 --port 8000 --reload"'

echo "Starting frontend server..."
osascript -e 'tell app "Terminal" to do script "cd \"'$PWD'\" && npm run dev-server"'

echo "========================================================================="
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  Health check: http://localhost:8000/api/status"
echo "========================================================================="
echo "Both servers are now running in separate terminal windows."
echo "Press Ctrl+C to exit this script (servers will continue running)."