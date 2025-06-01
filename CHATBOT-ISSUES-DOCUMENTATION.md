# NXT HUMANS AI CX WORKBENCH - Chatbot WebSocket Issues

## Problem Description

The chatbot in the NXT HUMANS AI CX Workbench is experiencing WebSocket communication issues that prevent it from functioning properly. The WebSocket connections are established but immediately close with error code 1006, resulting in the chatbot being unable to send or receive messages.

## Symptoms

1. WebSocket connections are established (reach OPEN state) but immediately close with error code 1006
2. The chatbot UI shows a continuous cycle of:
   - Creating WebSocket connection to `ws://localhost:8000/ws-proxy/{conversationId}`
   - WebSocket ERROR
   - WebSocket CLOSED (code: 1006, reason: )
   - Attempting to reconnect
3. Messages sent by users are queued but never delivered
4. No responses are received from the Claude API

## Technical Details

### Architecture

The workbench chatbot has a multi-tier architecture:

1. **Frontend Client**: Browser-based chatbot UI that establishes WebSocket connections
2. **Launchpad Proxy**: Flask application with Flask-Sock that proxies WebSocket connections
3. **Agent Service**: Python service that handles WebSocket connections and communicates with Claude API
4. **Claude API**: External API service that provides AI responses

### WebSocket Flow

1. The chatbot UI creates a WebSocket connection to `/ws-proxy/{conversationId}`
2. The launchpad's `ws_proxy` function should forward these connections to the agent service
3. The agent service should establish a connection with the Claude API
4. Messages should flow: UI → Launchpad Proxy → Agent Service → Claude API → Back through the same path

### Key Components

1. **Frontend WebSocket Client**: Implemented in `launchpad/static/chatbot.js`
   - Creates connections to `ws://127.0.0.1:8000/ws-proxy/{conversationId}`
   - Handles message sending and receiving
   - Manages connection state and reconnection

2. **Launchpad WebSocket Proxy**: Implemented in `launchpad/app.py`
   - Uses Flask-Sock to create a WebSocket endpoint at `/ws-proxy/{conversation_id}`
   - Should forward messages between client and agent service

3. **Agent WebSocket Server**: Implemented in `mcp-services/agent/app.py`
   - Creates a WebSocket endpoint that handles connections from the launchpad
   - Communicates with the Claude API
   - Returns responses back to the client

### Docker Configuration

The services are containerized using Docker Compose:
- Container networking uses a shared network (`nxt-humans-network`)
- Ports are mapped to the host for external access
- Environment variables are passed to containers for configuration

## Attempted Solutions

### 1. Docker Network Reconfiguration

- Modified `docker-compose.yml` and `dynamic-compose.yml` to ensure proper network configuration
- Adjusted port mappings to prevent conflicts
- Verified container name resolution within the Docker network

### 2. WebSocket Debugging

- Added debugging code to the frontend to monitor WebSocket traffic
- Modified templates to include WebSocket state logging
- Added debug panels to visualize connection status and message flow

### 3. Direct Connection Attempts

- Created scripts to bypass the launchpad proxy and connect directly to the agent
- Implemented standalone WebSocket servers running outside of Docker
- Developed client-side fixes to redirect connections

### 4. Standalone Agent Implementation

- Created a simplified agent implementation that runs outside of Docker
- Designed a client-side fix to intercept and handle WebSocket connections in the browser
- Implemented mock responses to demonstrate functionality

## Diagnosis

The primary issue appears to be in the communication between the launchpad proxy service and the agent service. Specifically:

1. WebSocket connections from the browser to the launchpad (`ws://localhost:8000/ws-proxy/{conversationId}`) are established successfully
2. The launchpad attempts to forward these connections to the agent service
3. This forwarding fails, causing the original WebSocket connection to close with error code 1006
4. The client repeatedly attempts to reconnect, but the same failure occurs each time

The failure may be due to:
- Docker network configuration issues
- Service initialization order
- WebSocket protocol handling in the proxy
- Timing issues in the connection establishment

## Detailed Code Issues

### Launchpad WebSocket Proxy (app.py)

```python
@sock.route('/ws-proxy/<conversation_id>')
def ws_proxy(ws, conversation_id):
    """
    WebSocket proxy for the agent service
    """
    # Get WebSocket URL for the agent
    if os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true':
        agent_url = f"ws://agent-orchestrator:8000/ws/{conversation_id}"
    else:
        # This fallback may be causing the issue if ENABLE_CX_AGENT is not set correctly
        agent_url = f"ws://127.0.0.1:8000/ws/{conversation_id}"
    
    # Attempt to connect to the agent
    agent_ws = websocket.create_connection(agent_url)
    
    # This creates a thread that might not be properly synchronized
    def agent_to_client():
        try:
            while True:
                message = agent_ws.recv()
                ws.send(message)
        except Exception as e:
            print(f"Error in agent_to_client: {str(e)}")
    
    # Start the forwarding thread
    thread = threading.Thread(target=agent_to_client)
    thread.daemon = True
    thread.start()
    
    # Forward messages from client to agent
    try:
        while True:
            message = ws.receive()
            agent_ws.send(message)
    except Exception as e:
        print(f"Error in ws_proxy: {str(e)}")
    finally:
        agent_ws.close()
```

The issues in this code may include:
- Incorrect WebSocket URL construction
- Lack of proper error handling
- Thread synchronization issues
- Potential deadlocks in message forwarding

## Environment Information

- **OS**: macOS
- **Docker**: Docker Desktop for Mac
- **Browser**: Chrome/Safari/Firefox (issue occurs in all browsers)
- **Python Version**: 3.11+
- **Key Containers**:
  - `launchpad` - The central UI and proxy service
  - `agent-orchestrator` - The agent service that communicates with Claude
  - Various MCP (Model Context Protocol) services

## Recommended Solutions

### Short-term Solution

1. Implement a client-side only fix that bypasses the WebSocket proxy:
   - Intercept WebSocket connections in the browser
   - Provide simulated responses for basic functionality
   - Display a status indicator to show the system is in fallback mode

### Medium-term Solution

1. Create a simplified standalone agent service that:
   - Runs outside of Docker on the host machine
   - Serves a direct WebSocket endpoint without proxying
   - Communicates directly with the Claude API
   - Can be accessed directly from the browser

2. Modify the client to connect directly to this service:
   - Update WebSocket URL construction
   - Add fallback mechanisms for connection failures
   - Improve error handling and user feedback

### Long-term Solution

1. Redesign the WebSocket communication architecture:
   - Replace the custom proxy with a more robust solution (e.g., Nginx, HAProxy)
   - Implement proper WebSocket connection pooling
   - Add comprehensive error handling and recovery mechanisms
   - Include detailed logging at all levels of the stack

2. Improve Docker configuration:
   - Ensure proper network configuration and service discovery
   - Add health checks and dependency ordering
   - Implement auto-recovery for failed services
   - Configure proper volume mapping for logs and persistent data

## Conclusion

The chatbot WebSocket issues are likely caused by a combination of Docker networking complexity and WebSocket proxy implementation challenges. The immediate solution is to implement a client-side fix or standalone agent, while the long-term solution requires architectural changes to the WebSocket communication flow and Docker configuration.

This document should provide a starting point for another developer to understand and address the issues.