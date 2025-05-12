#!/bin/bash
# Script to restart the agent service with the updated system message

echo "====================================================="
echo "    Restarting Agent Service with Updated Prompts    "
echo "====================================================="

# Stop the existing agent container
echo "Stopping agent container..."
docker stop agent

# Remove the container to ensure a clean restart
echo "Removing agent container..."
docker rm agent

# Start the agent container with the updated code
echo "Starting agent container with updated system message..."
docker compose -f docker-compose-agent.yml up -d agent

# Wait for the agent to initialize
echo "Waiting for agent to initialize (10 seconds)..."
sleep 10

# Get the agent IP
AGENT_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' agent)
echo "Agent container IP: $AGENT_IP"

# Update the docker-compose file with the correct IP
if [ ! -z "$AGENT_IP" ]; then
    echo "Updating extra_hosts in docker-compose-agent.yml..."
    sed -i'.bak' "s/agent:[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+/agent:$AGENT_IP/" docker-compose-agent.yml
fi

# Check the agent logs to verify it loaded properly
echo "Checking agent logs..."
docker logs agent | tail -n 20

echo "====================================================="
echo "              Agent Service Restarted                "
echo "====================================================="
echo "The agent service has been restarted with the updated system message."
echo "You can now use the chatbot with improved tool recognition."
echo "====================================================="