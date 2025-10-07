# NXT HUMANS AI CX WORKBENCH - Agent Fix

This document explains how to fix the WebSocket communication issues between the chatbot UI and the Claude agent in the NXT HUMANS AI CX Workbench.

## The Problem

The current setup encounters WebSocket communication issues where:
1. The WebSocket connection successfully establishes (shows "OPEN" state)
2. A conversation ID is generated
3. Messages are sent from the UI to the agent
4. However, no responses are received from the agent

This happens due to Docker networking complexities and how the WebSocket connections are proxied between the various services.

## The Solution

The solution decouples the agent from Docker while keeping the rest of the workbench running in Docker containers. This approach:

1. Creates a standalone WebSocket server that runs outside of Docker
2. Automatically injects JavaScript code into the HTML template to redirect WebSocket connections
3. Directly integrates with the Claude API to handle messages
4. Provides detailed logging for ongoing diagnostics

## Quick Start

1. Ensure you have your Anthropic API key ready
2. Open a terminal and navigate to the workbench directory
3. Run the launcher script:

```bash
./launch-agent-fix.sh
```

4. When prompted, enter your Anthropic API key
5. The agent fix will start and display status information
6. Keep the terminal window open while using the workbench

## Manual Testing

If the chatbot still doesn't respond after running the fix, you can manually force it to reconnect:

1. Open the workbench in your browser
2. Open browser DevTools (F12 or Right-click > Inspect)
3. Go to the Console tab
4. Enter the following command:
   ```javascript
   fixChatbotConnection()
   ```
5. This will reload the chatbot and force it to use the direct WebSocket connection

## How It Works

The fix works by:

1. **Standalone WebSocket Server**: Implements a WebSocket server on port 8500 that directly communicates with the Claude API.

2. **Template Modification**: Injects JavaScript code into the HTML template to intercept WebSocket connection attempts and redirect them to our standalone server.

3. **Direct API Integration**: Manages conversation state and directly interacts with the Claude API, bypassing Docker networking issues.

## Detailed Explanation

### WebSocket Routing

The original setup:
```
Browser -> Launchpad (ws-proxy) -> Agent Container -> Claude API
```

The fixed setup:
```
Browser -> Standalone WebSocket Server -> Claude API
```

### JavaScript Injection

The fix injects code into the HTML template that intercepts WebSocket connections to the `/ws-proxy/` endpoint and redirects them to our standalone server at `ws://localhost:8500/ws/`.

### Conversation Management

The standalone server maintains conversation state in memory and manages the conversation history to provide context to Claude for each interaction.

## Troubleshooting

### Logs

Check the `agent-fix.log` file for detailed logs about WebSocket connections and interactions with the Claude API.

### Common Issues

1. **WebSocket Connection Failed**: Ensure port 8500 is not in use by another application
2. **API Key Issues**: Verify your Anthropic API key is valid and has not expired
3. **Browser Caching**: Try clearing your browser cache or using incognito/private mode

### Advanced: Manual Cleanup

If you need to revert the changes:

1. Stop the agent fix server (Ctrl+C in the terminal)
2. Restore the original HTML template:
   ```bash
   cd "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/templates"
   mv enhanced-index.html.bak enhanced-index.html
   ```

## Additional Resources

- **WebSocket Debugging**: Check browser DevTools > Network tab > WS filter to monitor WebSocket traffic
- **Container Status**: Run `docker compose -f dynamic-compose.yml ps` to check container status
- **Docker Logs**: Run `docker compose -f dynamic-compose.yml logs launchpad` to view logs