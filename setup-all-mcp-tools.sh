#!/bin/bash
# setup-all-mcp-tools.sh
# This script sets up all MCP tool connections and tests them thoroughly

set -e  # Exit on error

# Print section header
print_header() {
    echo
    echo "===== $1 ====="
    echo
}

# Terminal colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running.${NC}"
        exit 1
    fi
}

# Check if docker-compose file exists
check_compose_file() {
    if [ ! -f "docker-compose-all.yml" ]; then
        echo -e "${RED}Error: docker-compose-all.yml not found.${NC}"
        exit 1
    fi
}

# Check if all services are running
check_services() {
    print_header "Checking Service Status"
    
    # Define required services
    services=("agent" "launchpad" "video-mcp" "journey-mcp" "reddit-mcp" "social-mcp" "openai-journey-mcp" "claude4-journey-mcp")
    
    # Check each service
    all_running=true
    for service in "${services[@]}"; do
        if docker compose -f docker-compose-all.yml ps | grep -q "$service" | grep -q "running"; then
            echo -e "${GREEN}✓${NC} $service is running"
        else
            echo -e "${RED}✗${NC} $service is not running"
            all_running=false
        fi
    done
    
    # Exit if any service is not running
    if [ "$all_running" = false ]; then
        echo -e "${YELLOW}Warning: Some services are not running. Start them with:${NC}"
        echo "docker compose -f docker-compose-all.yml up -d"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Fix WebSocket connections
fix_websocket() {
    print_header "Fixing WebSocket Connections"
    
    echo "Running fix-agent-websocket.py to ensure proper WebSocket connections..."
    python fix-agent-websocket.py
    
    # Check if the fix was successful
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}WebSocket connections fixed successfully.${NC}"
    else
        echo -e "${YELLOW}Warning: WebSocket fix may not have been completely successful.${NC}"
        echo "You can run 'python fix-agent-websocket.py --force' to force apply fixes."
    fi
}

# Test MCP Tools
test_mcp_tools() {
    print_header "Testing MCP Tools"
    
    echo "Running test_mcp_tools.py to verify all MCP services..."
    python test_mcp_tools.py
    
    # Check if the test was successful
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}MCP tools test completed successfully.${NC}"
    else
        echo -e "${YELLOW}Warning: MCP tools test found issues.${NC}"
        echo "You may need to fix individual MCP services. Check the logs for details."
    fi
}

# Refresh agent tools
refresh_agent_tools() {
    print_header "Refreshing Agent Tools"
    
    echo "Running refresh_agent_tools.py to update agent tool definitions..."
    python refresh_agent_tools.py
    
    # Check if the refresh was successful
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Agent tools refreshed successfully.${NC}"
    else
        echo -e "${YELLOW}Warning: Agent tools refresh encountered issues.${NC}"
        echo "You may need to restart the agent service with:"
        echo "docker compose -f docker-compose-all.yml restart agent"
    fi
}

# Test all workbench functionality
test_workbench() {
    print_header "Testing Workbench Functionality"
    
    # Create a test conversation with the agent
    echo "Testing agent with a simple query..."
    conversation_id=$(curl -s -X POST http://localhost:8500/api/chat/conversation | jq -r '.conversation_id')
    
    if [ -z "$conversation_id" ]; then
        echo -e "${RED}Failed to create a test conversation.${NC}"
        return 1
    fi
    
    echo "Created conversation: $conversation_id"
    
    # Send a test message
    response=$(curl -s -X POST http://localhost:8500/api/chat/message \
        -d "conversation_id=$conversation_id" \
        -d "message=List all the tools you have available." \
        | jq -r '.reply')
    
    if [ -z "$response" ]; then
        echo -e "${RED}Failed to get a response from the agent.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Agent responded successfully.${NC}"
    echo "Response snippet: ${response:0:100}..."
    
    return 0
}

# Main execution
main() {
    print_header "NXT HUMANS AI CX WORKBENCH SETUP"
    echo "This script will set up all MCP tool connections and test them thoroughly."
    
    # Perform checks
    check_docker
    check_compose_file
    check_services
    
    # Fix WebSocket connections
    fix_websocket
    
    # Test MCP tools
    test_mcp_tools
    
    # Refresh agent tools
    refresh_agent_tools
    
    # Test workbench
    test_workbench
    
    # Final summary
    print_header "SETUP COMPLETE"
    echo -e "${GREEN}All MCP tools have been set up and tested.${NC}"
    echo "You can now use the workbench with all tools available to the agent."
    echo
    echo "If you encounter any issues, you can run individual fix scripts:"
    echo "  - ./fix-agent-websocket.py --force  # Fix WebSocket connections"
    echo "  - python test_mcp_tools.py --verbose  # Test MCP tools in detail"
    echo "  - python refresh_agent_tools.py  # Refresh agent tool definitions"
    echo
    echo "Or restart all services with:"
    echo "  docker compose -f docker-compose-all.yml restart"
}

# Run the main function
main