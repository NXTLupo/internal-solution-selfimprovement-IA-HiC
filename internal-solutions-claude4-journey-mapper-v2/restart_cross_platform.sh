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
    
    # Check for any webpack dev server processes
    pgrep -f "webpack" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Found webpack processes. Killing them..."
        pkill -f "webpack" > /dev/null 2>&1 || true
        sleep 2
    fi
    
    # Check if ports are in use (platform independent approach)
    if command -v netstat > /dev/null 2>&1; then
        echo "Checking for processes on port 8000 and 3000..."
        netstat -tuln | grep -E ':8000|:3000' || echo "No processes found on ports 8000 and 3000"
    fi
    
    echo "Process cleanup completed."
}

# Run the cleanup function with error handling
set +e  # Temporarily disable strict error checking for the cleanup
kill_existing_processes
set -e  # Re-enable strict error checking

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Ollama is not running. Please start Ollama first with 'ollama serve'."
    echo "Starting Ollama is OS-dependent and may require a separate terminal."
    
    # Prompt user to start Ollama
    read -p "Would you like to proceed anyway? (y/n) " -n 1 -r
    echo    # Move to a new line
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please start Ollama and then run this script again."
        exit 1
    fi
else
    echo "Ollama is running."
    
    # Check if the model exists
    if ! curl -s http://localhost:11434/api/tags | grep -q "gemma"; then
        echo "Model 'gemma' not found in Ollama. Please pull it with 'ollama pull gemma:latest'."
        echo "Proceeding without the model may cause failures."
        
        read -p "Would you like to proceed anyway? (y/n) " -n 1 -r
        echo    # Move to a new line
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Exiting. Please pull the Gemma model and then run this script again."
            exit 1
        fi
    else
        echo "Gemma model is available."
    fi
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

# Start the backend and frontend in separate terminals (cross-platform approach)
echo "Starting backend and frontend services..."

# Start in the background with proper logging
echo "Starting API server (backend)..."
cd src
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "Backend started with PID: $BACKEND_PID"

# Give the backend a moment to start
sleep 3

# Start frontend server
echo "Starting frontend server..."
npm run dev-server > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "========================================================================="
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  Health check: http://localhost:8000/api/status"
echo "========================================================================="
echo "Both servers are now running in the background."
echo "To view backend logs: tail -f logs/backend.log"
echo "To view frontend logs: tail -f logs/frontend.log"
echo "To stop the servers, use: kill $BACKEND_PID $FRONTEND_PID"

# Save PIDs for later use
echo "$BACKEND_PID $FRONTEND_PID" > .running_pids
echo "PIDs saved to .running_pids file for easy stopping later."