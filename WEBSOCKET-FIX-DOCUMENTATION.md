# NXT HUMANS AI CX WORKBENCH - WebSocket Fix Documentation

This document explains the comprehensive solution implemented to fix the WebSocket communication issues in the NXT HUMANS AI CX Workbench.

## Problem Summary

The chatbot in the NXT HUMANS AI CX Workbench was experiencing WebSocket connection issues where:

1. WebSocket connections were successfully establishing (OPEN state)
2. Conversation IDs were being generated
3. WebSockets immediately closed with error code 1006 (abnormal closure)
4. No messages could be sent or received

## Root Causes

After thorough analysis, the following root causes were identified:

1. **Hostname Inconsistency**: Mismatch between container names (`agent` vs. `agent-orchestrator`)
2. **Synchronization Issues**: Poor thread management in the WebSocket proxy implementation
3. **Error Handling Gaps**: Insufficient error handling in the WebSocket proxy
4. **Protocol Implementation Flaws**: Missing ping/pong frames and proper close frames
5. **Connection Management**: Lack of retry logic and proper connection lifecycle management

## Solution Components

### 1. Docker Configuration Updates

- Updated container names to ensure consistency
- Added container hostname configuration to match container names
- Added health check for agent container
- Added DNS resolution with extra_hosts configuration
- Corrected environment variables for WebSocket URLs

### 2. Environment Variables

Added proper environment variables in `.env` file:

```
ENABLE_CX_AGENT=true
AGENT_WS_URL=ws://agent:8500
AGENT_CLIENT_WS_URL=ws://localhost:8500
ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
```

### 3. WebSocket Proxy Implementation

Completely rewrote the WebSocket proxy implementation in `launchpad/app.py` with:

- Robust error handling
- Connection retry logic with exponential backoff
- Proper thread synchronization using events
- Non-blocking message forwarding in both directions
- Detailed logging throughout the connection lifecycle
- Proper resource cleanup

### 4. Client-Side Fallback

Added a fallback mechanism in `client-fallback.js` that:

- Intercepts WebSocket connections
- Automatically switches to direct connection if proxy fails
- Provides detailed status information in the UI
- Offers manual connection mode switching

### 5. Deployment Script

Created `fix-websocket-connection.sh` to:

- Stop all services
- Install necessary dependencies
- Update environment variables
- Start the agent container first
- Update network configuration based on the agent's IP
- Start remaining services in the correct order

## How the Fix Works

### WebSocket Connection Flow

1. Client initiates connection to `/ws-proxy/{conversation_id}`
2. Launchpad WebSocket proxy accepts connection
3. Proxy attempts connection to agent using the correct URL
4. If connection fails, proxy retries with exponential backoff
5. Once connected, messages are forwarded bidirectionally
6. When either connection closes, proxy properly terminates resources

### Error Recovery

1. If proxy connection fails after multiple retries, client fallback switches to direct mode
2. In direct mode, WebSocket connections go directly to the agent container
3. If direct mode also fails, detailed error information is shown to the user

## Usage Instructions

### Automatic Fix Deployment

To apply the WebSocket connection fix:

1. Run the deployment script:
   ```bash
   ./fix-websocket-connection.sh
   ```
2. Wait for all services to start and initialize
3. Access the workbench at http://localhost:8000
4. The chatbot should now work properly

### Manual Client-Side Fallback

If the chatbot still doesn't respond:

1. Open your browser's Developer Tools (F12)
2. Paste the contents of `client-fallback.js` into the console
3. Press Enter to apply the client-side fallback
4. To force direct connection mode, run:
   ```javascript
   window.useDirectConnection();
   ```
5. Refresh the page to apply the changes

### Deploying to Production

When deploying to production, ensure that:

1. Container names and hostnames are consistent
2. Environment variables are correctly set
3. Network configuration allows proper communication
4. Proper health checks are enabled for all services

## Testing and Verification

To verify the fix:

1. Monitor the WebSocket connections in browser Developer Tools (Network tab, WS filter)
2. Check the logs from the launchpad container:
   ```bash
   docker logs -f nxthumans_ai_cx_workbench-launchpad-1
   ```
3. Check the logs from the agent container:
   ```bash
   docker logs -f agent
   ```
4. Test sending and receiving messages in the chatbot

## Troubleshooting

If issues persist:

1. Check if the agent container is running:
   ```bash
   docker ps | grep agent
   ```
2. Verify the agent's IP address:
   ```bash
   docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' agent
   ```
3. Update the extra_hosts configuration with the correct IP
4. Check if the WebSocket server is responding on the agent:
   ```bash
   curl -v http://localhost:8500/health
   ```
5. Ensure the ANTHROPIC_API_KEY is valid and has proper permissions

## Conclusion

This comprehensive fix addresses all aspects of the WebSocket communication issues in the NXT HUMANS AI CX Workbench. By implementing robust error handling, proper thread synchronization, connection retry logic, and client-side fallbacks, the chatbot should now function reliably.

If you need further assistance, please refer to the logs and error messages, as they now contain detailed information to help diagnose any remaining issues.