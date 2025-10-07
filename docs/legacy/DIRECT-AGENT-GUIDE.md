# Direct Agent Solution for NXT HUMANS AI CX WORKBENCH

This guide explains how to fix the WebSocket connection issues with the chatbot in the NXT HUMANS AI CX Workbench using our Direct Agent solution.

## Quick Start

1. Open a terminal and navigate to the workbench directory
2. Run the direct agent server:

```bash
./run-direct-agent.sh
```

3. When prompted, enter your Anthropic API key
4. The direct agent server will start on port 8500
5. Open the workbench in your browser (http://localhost:8000)
6. In your browser's Developer Tools console (F12), paste this code to inject the client fix:

```javascript
const script = document.createElement('script'); 
script.src = 'http://localhost:8500/client.js'; 
document.head.appendChild(script);
```

7. The chatbot should now work directly through our standalone agent server

## How It Works

The Direct Agent Solution works by:

1. Running a standalone WebSocket server outside of Docker
2. Injecting client-side JavaScript that intercepts WebSocket connections in the chatbot iframe
3. Redirecting those connections to our standalone server
4. Providing a visual status indicator to show connection status

This bypasses the Docker networking issues that were preventing the chatbot from working properly.

## The Problem

The original setup encounters WebSocket issues where:
- The WebSocket connection initiates but quickly closes with error code 1006
- The chatbot UI displays CONNECTING and ERROR messages repeatedly
- No messages are delivered to the Claude API

This happens because of Docker networking complexities and WebSocket proxy issues.

## Troubleshooting

### Check Server Status

The Direct Agent Server provides a status endpoint at:
```
http://localhost:8500/status
```

### Connection Errors

If you see continuous connection errors in the console:

1. Make sure the Direct Agent Server is running (`./run-direct-agent.sh`)
2. Check that port 8500 is not blocked by a firewall
3. Verify that your browser can establish WebSocket connections
4. Try restarting your browser

### Manually Fix Connection

If the automatic fix doesn't work, you can manually reconnect by running this command in the browser console:

```javascript
window.directAgentCommands.reconnect();
```

Or show the status panel:

```javascript
window.directAgentCommands.showStatus();
```

### Server Logs

Check the `agent-server.log` file for detailed logs about server operations and API interactions.

## Advanced: For Persistent Fix

To make the fix persist across page reloads, you can create a browser extension or modify the launchpad HTML template directly.

To modify the template directly:

1. Edit `/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/templates/enhanced-index.html`
2. Add this code before the closing `</body>` tag:

```html
<!-- Direct Agent Fix -->
<script>
  window.addEventListener('load', function() {
    const script = document.createElement('script');
    script.src = 'http://localhost:8500/client.js';
    document.head.appendChild(script);
  });
</script>
```

3. Save the file and reload the page