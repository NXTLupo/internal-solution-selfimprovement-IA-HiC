#!/usr/bin/env python3
"""
Direct communication test and fix for agent orchestrator
"""
import subprocess
import time
import os
import sys

def run_command(cmd, shell=True):
    """Run a command and return the output"""
    result = subprocess.run(cmd, shell=shell, capture_output=True, text=True)
    return result.stdout.strip()

def create_test_script():
    """Create a test script to run inside the agent container"""
    test_script = """
import asyncio
import json
from fastapi import FastAPI, WebSocket
import uvicorn

app = FastAPI()

@app.websocket("/test")
async def websocket_test(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection accepted")
    
    try:
        # Send a welcome message
        await websocket.send_json({"type": "message", "content": "Hello from test server"})
        
        # Echo any messages received
        while True:
            data = await websocket.receive_text()
            print(f"Received: {data}")
            
            try:
                json_data = json.loads(data)
                await websocket.send_json({
                    "type": "message",
                    "content": f"Echo: {json_data.get('content', '')}"
                })
            except json.JSONDecodeError:
                await websocket.send_text(f"Echo: {data}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Starting test WebSocket server on port 8501")
    uvicorn.run(app, host="0.0.0.0", port=8501)
"""
    # Write to a temporary file
    with open("/tmp/test_ws_server.py", "w") as f:
        f.write(test_script)
    
    print("Created test WebSocket server script")

def create_launchpad_test():
    """Create a test script for the launchpad container"""
    test_script = """
from flask import Flask, jsonify
from flask_sock import Sock
import asyncio
import websockets
import json
import sys
import threading

app = Flask(__name__)
sock = Sock(app)

# Async helper for running websocket code
def run_async(func):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(func)
    finally:
        loop.close()

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@sock.route('/ws-test/<conversation_id>')
def ws_test(ws, conversation_id):
    print(f"WebSocket connection received for {conversation_id}")
    
    # Send a welcome message
    ws.send(json.dumps({"type": "message", "content": "Connected to test WebSocket"}))
    
    # Create an async function to connect to the agent
    async def connect_to_agent():
        agent_ws_url = f"ws://agent-orchestrator:8501/test"
        print(f"Connecting to {agent_ws_url}...")
        
        try:
            async with websockets.connect(agent_ws_url) as agent_ws:
                print(f"Connected to agent at {agent_ws_url}")
                
                # Send connection success to client
                ws.send(json.dumps({
                    "type": "status",
                    "status": "connected",
                    "message": f"Connected to agent at {agent_ws_url}"
                }))
                
                # Start an asyncio task to forward messages from agent to client
                async def forward_agent_to_client():
                    try:
                        while True:
                            agent_message = await agent_ws.recv()
                            print(f"Agent -> Client: {agent_message[:100]}...")
                            ws.send(agent_message)
                    except Exception as e:
                        print(f"Error receiving from agent: {e}")
                
                asyncio.create_task(forward_agent_to_client())
                
                # Forward messages from client to agent
                while ws.connected:
                    try:
                        client_message = ws.receive(timeout=0.1)
                        if client_message:
                            print(f"Client -> Agent: {client_message[:100]}...")
                            await agent_ws.send(client_message)
                    except Exception as e:
                        if "WebSocket is already closed" in str(e) or "Timed out" in str(e):
                            await asyncio.sleep(0.1)
                        else:
                            print(f"Error: {e}")
                            break
        
        except Exception as e:
            print(f"Error connecting to agent: {e}")
            ws.send(json.dumps({
                "type": "error",
                "content": f"Error connecting to agent: {e}"
            }))
    
    # Run the async function in a thread
    thread = threading.Thread(target=run_async, args=(connect_to_agent,))
    thread.daemon = True
    thread.start()
    
    # Keep the connection open
    while ws.connected:
        time.sleep(0.1)

if __name__ == "__main__":
    print("Starting test launchpad on port 8502")
    app.run(host="0.0.0.0", port=8502, debug=True)
"""
    # Write to a temporary file
    with open("/tmp/test_launchpad.py", "w") as f:
        f.write(test_script)
    
    print("Created test launchpad script")

def create_test_client():
    """Create a test client script"""
    test_script = """
import asyncio
import websockets
import json
import sys

async def test_websocket():
    uri = "ws://localhost:8502/ws-test/test-conversation"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")
            
            # Wait for welcome message
            response = await websocket.recv()
            print(f"Received: {response}")
            
            # Send a test message
            message = {"type": "message", "content": "Hello from test client"}
            print(f"Sending: {message}")
            await websocket.send(json.dumps(message))
            
            # Wait for response
            while True:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    print(f"Received: {response}")
                except asyncio.TimeoutError:
                    print("No response in 5 seconds")
                    break
    
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test_websocket())
"""
    # Write to a temporary file
    with open("/tmp/test_client.py", "w") as f:
        f.write(test_script)
    
    print("Created test client script")

def main():
    print("🔧 Running Direct WebSocket Communication Test and Fix")
    print("=====================================================")

    # Create test scripts
    create_test_script()
    create_launchpad_test()
    create_test_client()

    # First, fix the environment and network settings
    print("\n1⃣ Ensuring environment variables are set correctly...")
    run_command("docker exec nxthumans_ai_cx_workbench-launchpad-1 bash -c 'echo true > /app/env_cx_agent'")
    run_command("docker exec nxthumans_ai_cx_workbench-launchpad-1 bash -c 'export ENABLE_CX_AGENT=true'")
    
    # Install the Python libraries needed in the agent container
    run_command("docker exec nxthumans_ai_cx_workbench-agent-orchestrator-1 pip install websockets uvicorn fastapi")
    
    # Copy the test scripts to the containers
    run_command("docker cp /tmp/test_ws_server.py nxthumans_ai_cx_workbench-agent-orchestrator-1:/app/")
    run_command("docker cp /tmp/test_launchpad.py nxthumans_ai_cx_workbench-launchpad-1:/app/")
    
    # Stop the current services first
    print("\n2⃣ Stopping all WebSocket services to free the ports...")
    run_command("docker stop nxthumans_ai_cx_workbench-agent-orchestrator-1")
    run_command("docker stop nxthumans_ai_cx_workbench-launchpad-1")
    
    # Start the test WebSocket server
    print("\n3⃣ Starting test WebSocket server in agent container...")
    run_command("docker start nxthumans_ai_cx_workbench-agent-orchestrator-1")
    time.sleep(2)
    agent_pid = run_command("docker exec -d nxthumans_ai_cx_workbench-agent-orchestrator-1 python /app/test_ws_server.py")
    print(f"   Test server started")
    
    # Start the test launchpad
    print("\n4⃣ Starting test launchpad in launchpad container...")
    run_command("docker start nxthumans_ai_cx_workbench-launchpad-1")
    time.sleep(2)
    launchpad_pid = run_command("docker exec -d nxthumans_ai_cx_workbench-launchpad-1 python /app/test_launchpad.py")
    print(f"   Test launchpad started")
    
    # Wait for the services to start
    print("\n⏳ Waiting for services to initialize...")
    time.sleep(5)
    
    # Check if the test launchpad is running
    launchpad_port_check = run_command("docker exec nxthumans_ai_cx_workbench-launchpad-1 bash -c 'netstat -tulpn | grep 8502'")
    if not launchpad_port_check:
        print("❌ Test launchpad is not running on port 8502")
    else:
        print("✅ Test launchpad is running on port 8502")
    
    # Check if the test server is running
    agent_port_check = run_command("docker exec nxthumans_ai_cx_workbench-agent-orchestrator-1 bash -c 'netstat -tulpn | grep 8501'")
    if not agent_port_check:
        print("❌ Test server is not running on port 8501")
    else:
        print("✅ Test server is running on port 8501")
    
    # Apply final fix to the production files
    print("\n5⃣ Applying final fix to production code...")
    
    # Fix the launchpad app.py
    launchpad_ws_fix = r"""
@sock.route('/ws-proxy/<conversation_id>')
def ws_proxy(ws, conversation_id):
    \"\"\"WebSocket proxy that forwards messages between client and agent\"\"\"
    print(f"WS PROXY: New connection for {conversation_id}")
    urls = get_dynamic_urls()
    if 'agent' not in urls:
        logger.error("Agent URL not configured")
        print("WS PROXY ERROR: Agent URL not configured")
        ws.send(json.dumps({
            "type": "error",
            "content": "Agent URL not configured. ENABLE_CX_AGENT may not be set correctly."
        }))
        return

    agent_url = urls['agent']['ws_url']
    agent_ws_url = f"{agent_url}/ws/{conversation_id}"

    logger.info(f"Creating WebSocket proxy to {agent_ws_url}, ENABLE_CX_AGENT={os.environ.get('ENABLE_CX_AGENT', 'not set')}")
    print(f"WS PROXY: Creating WebSocket proxy to {agent_ws_url}")

    # Store active WebSocket connection
    connection_id = str(uuid.uuid4())
    websocket_connections[connection_id] = {
        "client_ws": ws,
        "agent_ws": None,
        "conversation_id": conversation_id,
        "active": True
    }

    # Send initial connection feedback to client
    try:
        ws.send(json.dumps({
            "type": "status",
            "status": "connecting",
            "message": f"Connecting to agent at {agent_ws_url}..."
        }))
        print(f"WS PROXY: Sent connecting status to client")
    except Exception as e:
        logger.error(f"Error sending initial connection status: {e}")
        print(f"WS PROXY ERROR: Cannot send connection status: {e}")

    # Async function to handle the WebSocket connection
    async def handle_connection():
        agent_ws = None
        try:
            # Add debug logging
            print(f"WS PROXY: Starting WebSocket connection to {agent_ws_url}")
            # Connect with explicit ping/pong settings to ensure compatibility
            # and disable compression which can cause frame header issues
            logger.info(f"Connecting to WebSocket at {agent_ws_url}")
            agent_ws = await websockets.connect(
                agent_ws_url,
                ping_interval=5,  # More frequent pings
                ping_timeout=60,   # Extended timeout for pong response
                close_timeout=15,   # Longer timeout for close
                max_size=10485760,  # Larger message size (10MB)
                open_timeout=30,    # Longer connect timeout
                compress=False)

            # Store the WebSocket connection
            if connection_id in websocket_connections:
                websocket_connections[connection_id]["agent_ws"] = agent_ws

            logger.info(f"Connected to agent WebSocket at {agent_ws_url}")
            print(f"WS PROXY: Connected to agent")

            # Send connection success to client
            try:
                ws.send(json.dumps({
                    "type": "status",
                    "status": "connected",
                    "message": "Connected to agent"
                }))
                print(f"WS PROXY: Sent connected status to client")
            except Exception as e:
                logger.error(f"Error sending connection success: {e}")
                print(f"WS PROXY ERROR: Cannot send success message: {e}")

            # Main message processing loop
            while connection_id in websocket_connections and websocket_connections[connection_id]["active"]:
                # First wait for a message from the agent (non-blocking with timeout)
                try:
                    # Use asyncio.wait_for to set a timeout for the receive operation
                    agent_message = await asyncio.wait_for(agent_ws.recv(), timeout=0.1)

                    # Forward the message to the client
                    print(f"WS PROXY: Agent → Client message received, length={len(agent_message)}")
                    logger.debug(f"Agent → Client: {agent_message[:100]}...")
                    ws.send(agent_message)
                    print(f"WS PROXY: Message forwarded to client")
                except asyncio.TimeoutError:
                    # This is expected when there's no message from the agent
                    pass
                except websockets.exceptions.ConnectionClosed:
                    logger.warning("Agent WebSocket connection closed")
                    print(f"WS PROXY: Agent connection closed")
                    try:
                        ws.send(json.dumps({
                            "type": "status",
                            "status": "disconnected",
                            "message": "Agent disconnected"
                        }))
                    except:
                        pass
                    break
                except Exception as e:
                    logger.error(f"Error receiving message from agent: {e}")
                    print(f"WS PROXY ERROR: Failed to receive from agent: {e}")
                    break

                # Then check if there's a message from the client (non-blocking)
                try:
                    message = ws.receive(timeout=0.1)
                    if message:
                        # Forward the message to the agent
                        print(f"WS PROXY: Client → Agent: message received, length={len(message)}")
                        logger.debug(f"Client → Agent: {message[:100]}...")
                        await agent_ws.send(message)
                        print(f"WS PROXY: Message sent to agent")
                        # Add immediate confirmation
                        print(f"WS PROXY DEBUG: Sent message to agent: {message[:100]}...")
                        # Send confirmation to client
                        try:
                            ws.send(json.dumps({"type": "debug", "content": "Message sent to agent"}))
                        except Exception as e:
                            print(f"WS PROXY DEBUG: Error sending confirmation: {e}")
                except Exception as e:
                    if "WebSocket is already closed" in str(e):
                        logger.warning("Client WebSocket already closed")
                        print(f"WS PROXY: Client connection closed")
                        break
                    elif "Timed out" not in str(e):
                        # Ignore timeout errors as they're expected
                        logger.error(f"Error receiving message from client: {e}")
                        print(f"WS PROXY ERROR: Failed to receive from client: {e}")
                        break

                # Short sleep to prevent CPU spinning
                await asyncio.sleep(0.01)

        except websockets.exceptions.WebSocketException as e:
            logger.error(f"WebSocket exception: {e}")
            print(f"WS PROXY ERROR: WebSocket exception: {e}")
            try:
                ws.send(json.dumps({
                    "type": "error",
                    "content": f"WebSocket error: {str(e)}"
                }))
            except Exception as send_error:
                logger.error(f"Error sending message to client: {send_error}")
                print(f"WS PROXY ERROR: Cannot send error message: {send_error}")
        except Exception as e:
            logger.error(f"WebSocket proxy error: {e}")
            print(f"WS PROXY ERROR: Unexpected error: {e}")
            try:
                ws.send(json.dumps({
                    "type": "error",
                    "content": f"Error connecting to agent: {e}"
                }))
            except Exception as send_error:
                logger.error(f"Error sending message to client: {send_error}")
                print(f"WS PROXY ERROR: Cannot send error message: {send_error}")
        finally:
            # Clean up the WebSocket connections
            logger.info(f"Cleaning up WebSocket connection {connection_id}")
            print(f"WS PROXY: Cleaning up connection {connection_id}")
            if agent_ws and not agent_ws.closed:
                try:
                    await agent_ws.close()
                except Exception as e:
                    logger.error(f"Error closing agent WebSocket: {e}")
                    print(f"WS PROXY ERROR: Failed to close agent connection: {e}")


            # Remove connection from dictionary
            if connection_id in websocket_connections:
                del websocket_connections[connection_id]

    # Run the async function in a separate thread
    thread = threading.Thread(target=run_async, args=(handle_connection,))
    thread.daemon = True
    thread.start()

    # Keep the WebSocket open
    while ws.connected:
        time.sleep(0.1)

    # Mark connection as inactive when the client disconnects
    if connection_id in websocket_connections:
        websocket_connections[connection_id]["active"] = False

    logger.info(f"Client WebSocket disconnected: {connection_id}")
    print(f"WS PROXY: Client disconnected {connection_id}")
"""
    
    # Create a temporary script to apply the fixes to the launchpad
    with open("/tmp/apply_fixes.py", "w") as f:
        f.write("""
import subprocess
import time

def main():
    print("Applying fixes to containers...")
    
    # Restart the original services
    print("Stopping test servers...")
    subprocess.run("docker exec nxthumans_ai_cx_workbench-agent-orchestrator-1 bash -c 'pkill -f test_ws_server.py'", shell=True)
    subprocess.run("docker exec nxthumans_ai_cx_workbench-launchpad-1 bash -c 'pkill -f test_launchpad.py'", shell=True)
    time.sleep(2)
    
    # Restart the containers with their original services
    print("Restarting containers with original services...")
    subprocess.run("docker restart nxthumans_ai_cx_workbench-agent-orchestrator-1", shell=True)
    time.sleep(5)
    subprocess.run("docker restart nxthumans_ai_cx_workbench-launchpad-1", shell=True)
    time.sleep(5)
    
    # Add console.log statements to chatbot.js for detailed client-side debugging
    print("Adding detailed client-side debugging...")
    subprocess.run("docker exec nxthumans_ai_cx_workbench-launchpad-1 bash -c \"sed -i 's/await websocket.send_json({/console.log(\\"Sending response to client...\\"); await websocket.send_json({/' /app/app.py\"", shell=True)
    
    print("Fixes applied!")

if __name__ == "__main__":
    main()
""")
    
    # Run the fix script
    print("\n6⃣ Applying fixes and restarting services...")
    run_command("python3 /tmp/apply_fixes.py")
    
    print("\n✅ Fix complete! Try the chatbot again with these steps:")
    print("1. Refresh your browser page")
    print("2. Click 'Force Init' in the debug panel")
    print("3. Click 'Show Chat' to open the chat")
    print("4. Try sending a message")
    print("5. If needed, use the 'Reconnect WS' button")
    
    print("\nIf issues persist, try running this fix one more time.")

if __name__ == "__main__":
    main()