#\!/usr/bin/env python3
import os
import sys
import re

# Check if file exists
app_py_path = '/app/app.py'
if not os.path.exists(app_py_path):
    print(f"Error: {app_py_path} not found")
    sys.exit(1)

# Read the file
with open(app_py_path, 'r') as f:
    content = f.read()

# Create backup
with open(f'{app_py_path}.bak.debug', 'w') as f:
    f.write(content)

print("Creating backup at app.py.bak.debug")

# Fix 1: Add debug log statements to the WebSocket proxy
websocket_proxy_pattern = r'(async def handle_connection\(\):.*?agent_ws = None.*?try:.*?)(# Connect with explicit ping/pong settings)'
replacement = r'\1# Add debug logging\n                print(f"DEBUG: Starting WebSocket connection to {agent_ws_url}")\n                \2'
updated_content = re.sub(websocket_proxy_pattern, replacement, content, flags=re.DOTALL)

# Fix 2: Add more debugging around the message forwarding
message_forwarding_pattern = r'(# Forward the message to the agent.*?logger\.debug.*?await agent_ws\.send\(message\))'
message_replacement = r'\1\n                            # Add immediate confirmation\n                            print(f"DEBUG: Sent message to agent: {message[:100]}...")\n                            # Send confirmation to client\n                            try:\n                                ws.send(json.dumps({"type": "debug", "content": "Message sent to agent"}))\n                            except Exception as e:\n                                print(f"DEBUG: Error sending confirmation: {e}")'
updated_content = re.sub(message_forwarding_pattern, message_replacement, updated_content, flags=re.DOTALL)

# Fix 3: Adjust timeouts
timeout_pattern = r'(agent_ws = await websockets\.connect\()([^)]*)'
timeout_replacement = r'\1\n                    agent_ws_url,\n                    ping_interval=5,  # More frequent pings\n                    ping_timeout=30,   # Longer timeout for pong response\n                    close_timeout=10,   # Longer timeout for close\n                    max_size=10485760,  # Larger message size (10MB)\n                    open_timeout=30,    # Longer connect timeout\n                    compress=False'
updated_content = re.sub(timeout_pattern, timeout_replacement, updated_content, flags=re.DOTALL)

# Write the updated content
with open(app_py_path, 'w') as f:
    f.write(updated_content)

print("Updated app.py with WebSocket debugging improvements")
print("Restart the launchpad service to apply changes")
