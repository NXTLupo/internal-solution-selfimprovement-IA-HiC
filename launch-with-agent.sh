#!/bin/bash

# Set up environment variables
export ENABLE_CX_AGENT=true
export AGENT_ORCHESTRATOR_PORT=8500
export REDDIT_MCP_PORT=8501
export SOCIAL_MCP_PORT=8502
export JOURNEY_MCP_PORT=8503

# Check if user provided API key as argument
if [ "$1" != "" ]; then
  export ANTHROPIC_API_KEY=$1
else
  # Use the key from CLAUDE.md if none provided (not recommended for production)
  echo "WARNING: Using default Anthropic API key from repository. For production, please provide your own key."
  export ANTHROPIC_API_KEY=***REDACTED-ANTHROPIC-KEY***
fi

# Create required directories if they don't exist
mkdir -p mcp-services/agent/logs
mkdir -p mcp-services/journey-mcp/uploads
mkdir -p /tmp/journey-mcp

# Make sure the temporary directories have the right permissions
chmod 777 mcp-services/agent/logs
chmod 777 mcp-services/journey-mcp/uploads
chmod 777 /tmp/journey-mcp

# Stop any existing services
echo "Stopping any existing services..."
docker compose -f docker-compose-agent.yml down

# Start all services with agent support
echo "Starting services with AI agent enabled..."
docker compose -f docker-compose-agent.yml up -d

echo "NXT Humans AI CX Workbench is starting with AI Agent support."
echo "Access the workbench at: http://localhost:${LAUNCHPAD_PORT:-8000}"
echo ""
echo "Services being started:"
echo "- Launchpad: http://localhost:${LAUNCHPAD_PORT:-8000}"
echo "- Journey Mapper: http://localhost:${JOURNEY_MAPPER_PORT:-8080}"
echo "- Reddit Ripper: http://localhost:${REDDIT_RIPPER_PORT:-5001}"
echo "- Social Research Tool: http://localhost:${SOCIAL_RESEARCH_PORT:-3000}"
echo "- Agent Orchestrator: http://localhost:${AGENT_ORCHESTRATOR_PORT:-8500}"
echo "- Reddit MCP: http://localhost:${REDDIT_MCP_PORT:-8501}"
echo "- Social MCP: http://localhost:${SOCIAL_MCP_PORT:-8502}"
echo "- Journey MCP: http://localhost:${JOURNEY_MCP_PORT:-8503}"
echo ""
echo "To view logs: docker compose -f docker-compose-agent.yml logs -f [service-name]"
echo "To stop: docker compose -f docker-compose-agent.yml down"