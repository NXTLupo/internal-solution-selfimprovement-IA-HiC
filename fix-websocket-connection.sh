#!/bin/bash

# WebSocket Connection Fix for NXT HUMANS AI CX Workbench
# This script applies the necessary fixes to make WebSocket connections between
# the client and agent service more robust and reliable.

# Set script to exit on error
set -e

# Display script header
echo "====================================================="
echo "NXT HUMANS AI CX Workbench - WebSocket Connection Fix"
echo "====================================================="

# Check if we have write permission
if [ ! -w "$(pwd)/launchpad/app.py" ]; then
  echo "Error: You don't have write permissions for the launchpad/app.py file."
  echo "Please run this script with appropriate permissions."
  exit 1
fi

# Check if we're in the right directory
if [ ! -d "launchpad" ] || [ ! -d "mcp-services" ]; then
  echo "Error: This script must be run from the NXT HUMANS AI CX Workbench root directory."
  exit 1
fi

# Function to stop all running containers
stop_containers() {
  echo "Stopping all running containers..."
  docker compose -f docker-compose-all.yml down 2>/dev/null || true
  docker compose -f docker-compose-agent.yml down 2>/dev/null || true
  docker compose -f docker-compose-video-fixed.yml down 2>/dev/null || true
  echo "All containers stopped."
}

# Function to apply the patch to launchpad/app.py
apply_launchpad_patch() {
  echo "Applying WebSocket proxy patch to launchpad/app.py..."
  
  # Create backup of the original file
  cp launchpad/app.py launchpad/app.py.bak_$(date +%Y%m%d%H%M%S)
  
  # Apply the patch
  patch -p0 < launchpad/app_ws_enhanced.patch || true
  
  echo "Patch applied to launchpad/app.py."
}

# Function to install the client-side fallback
install_client_fallback() {
  echo "Installing client-side WebSocket fallback..."
  
  # Make sure the target directory exists
  mkdir -p launchpad/static/
  
  # Copy client-side fallback to static directory
  cp fix-ws-client.js launchpad/static/chatbot.fallback.js
  
  # Insert script tag into templates
  if ! grep -q "chatbot.fallback.js" launchpad/templates/enhanced-index.html; then
    # Create a backup
    cp launchpad/templates/enhanced-index.html launchpad/templates/enhanced-index.html.bak_$(date +%Y%m%d%H%M%S)
    
    # Insert script tag before the closing body tag
    sed -i '' 's|</body>|<script src="/static/chatbot.fallback.js"></script></body>|' launchpad/templates/enhanced-index.html
  fi
  
  echo "Client-side fallback installed."
}

# Function to apply environment variable fixes
update_env_vars() {
  echo "Updating environment variables..."
  
  # Check if .env file exists, create if not
  if [ ! -f ".env" ]; then
    touch .env
  fi
  
  # Make backup of .env file
  cp .env .env.bak_$(date +%Y%m%d%H%M%S)
  
  # Add or update environment variables
  grep -q "^ENABLE_CX_AGENT" .env || echo "ENABLE_CX_AGENT=true" >> .env
  grep -q "^AGENT_WS_URL" .env || echo "AGENT_WS_URL=ws://agent:8500" >> .env
  grep -q "^AGENT_CLIENT_WS_URL" .env || echo "AGENT_CLIENT_WS_URL=ws://localhost:8500" >> .env
  
  echo "Environment variables updated."
}

# Function to start services with the fix
start_services() {
  echo "Starting services with WebSocket fix..."
  
  # Start agent container first to ensure it gets a consistent IP
  echo "Starting agent container..."
  docker compose -f docker-compose-agent.yml up -d
  
  # Wait for the agent container to be ready
  echo "Waiting for agent container to be ready..."
  sleep 5
  
  # Get the agent container IP address
  AGENT_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' agent)
  if [ -z "$AGENT_IP" ]; then
    echo "Could not determine agent container IP address."
    echo "Using default container name 'agent' for connections."
  else
    echo "Agent container IP: $AGENT_IP"
    # Update the direct IP in the environment
    sed -i '' "s|^AGENT_DIRECT_IP=.*$|AGENT_DIRECT_IP=$AGENT_IP|" .env
    grep -q "^AGENT_DIRECT_IP" .env || echo "AGENT_DIRECT_IP=$AGENT_IP" >> .env
  fi
  
  # Start all other services
  echo "Starting remaining services..."
  docker compose -f docker-compose-all.yml up -d
  
  echo "All services started."
}

# Main execution
echo "Starting WebSocket connection fix..."

# Stop all running containers
stop_containers

# Apply the patch to launchpad/app.py
apply_launchpad_patch

# Install client-side fallback
install_client_fallback

# Update environment variables
update_env_vars

# Start services with the fix
start_services

echo "======================="
echo "WebSocket fix completed"
echo "======================="
echo "Access the workbench at http://localhost:8000"
echo ""
echo "If the chatbot still doesn't respond:"
echo "1. Open your browser's Developer Tools (F12)"
echo "2. In the console, run: useDirectConnection()"
echo "3. Try using the chatbot again"
echo ""
echo "For detailed log information, run:"
echo "docker logs -f nxthumans_ai_cx_workbench-launchpad-1"
echo "docker logs -f agent"
echo ""
echo "For more information, see WEBSOCKET-FIX-DOCUMENTATION.md"