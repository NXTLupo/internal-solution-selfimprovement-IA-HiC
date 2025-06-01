#!/bin/bash

# Full launch script for Claude 4 Journey Mapper

# Make sure the script exits if any command fails
set -e

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p logs uploads journey_maps

# Set the default port
DEFAULT_PORT=8090

# Function to check if a port is available
check_port() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    if lsof -i :$port >/dev/null 2>&1; then
      return 1 # Port is in use
    else
      return 0 # Port is available
    fi
  elif command -v netstat >/dev/null 2>&1; then
    if netstat -tuln | grep -q :$port; then
      return 1 # Port is in use
    else
      return 0 # Port is available
    fi
  else
    # If we can't check, assume it's available
    return 0
  fi
}

# Find an available port
PORT=$DEFAULT_PORT
if ! check_port $PORT; then
  echo "Port $PORT is in use, trying alternative ports..."
  for p in 8888 9090 9000; do
    if check_port $p; then
      PORT=$p
      echo "Using port $PORT"
      break
    fi
  done
fi

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "ANTHROPIC_API_KEY environment variable is not set."
  echo "Please set it using: export ANTHROPIC_API_KEY=your_api_key"
  exit 1
fi

# Set the model
export ANTHROPIC_MODEL=anthropic.claude-sonnet-4-20250514-v1:0

# Update launchpad integration
echo "Updating launchpad integration..."
if [ -f "update-launchpad.py" ]; then
  python update-launchpad.py
else
  echo "Warning: update-launchpad.py script not found. Launchpad integration may not be complete."
fi

# Launch the application
echo "Starting Claude 4 Journey Mapper on port $PORT..."
python run.py --port $PORT

echo "Claude 4 Journey Mapper started successfully!"