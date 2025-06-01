#!/usr/bin/env python3
import subprocess
import time
import os

# File to write inside the container
patch_code = '''
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for maximum verbosity
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("agent-orchestrator")

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time chat"""
    logger.debug(f"WebSocket connection attempt for conversation {conversation_id}")
    print(f"WebSocket connection attempt for conversation {conversation_id}")
    await websocket.accept()
    logger.debug(f"WebSocket accepted for conversation {conversation_id}")
    print(f"WebSocket accepted for conversation {conversation_id}")
    
    # Initialize conversation if needed
    if conversation_id not in conversations:
        logger.debug(f"Initializing new conversation {conversation_id}")
        print(f"Initializing new conversation {conversation_id}")
        await initialize_conversation(conversation_id)
    
    try:
        logger.debug(f"Starting message loop for conversation {conversation_id}")
        print(f"Starting message loop for conversation {conversation_id}")
        while True:
            # Receive message from client
            try:
                data = await websocket.receive_json()
                message_type = data.get("type", "")
                logger.debug(f"Received {message_type} message from client: {data}")
                print(f"Received {message_type} message from client: {data}")
                
                if message_type == "message":
                    # Regular text message
                    user_message = data.get("content", "")
                    logger.debug(f"Processing user message: {user_message[:50]}...")
                    print(f"Processing user message: {user_message[:50]}...")
                    
                    # Process with Claude (use empty string if message is None)
                    response = await process_message(conversation_id, user_message or "")
                    logger.debug(f"Sending response back to client: {response[:50]}...")
                    print(f"Sending response back to client: {response[:50]}...")
                    
                    # Send response back to client
                    await websocket.send_json({
                        "type": "message",
                        "content": response
                    })
                    
                elif message_type == "file":
                    # File upload message
                    file_data_base64 = data.get("file", {}).get("data", "")
                    file_name = data.get("file", {}).get("name", "unnamed_file")
                    message_text = data.get("content", "")
                    logger.debug(f"Processing file upload: {file_name}")
                    print(f"Processing file upload: {file_name}")
                    
                    if file_data_base64:
                        # Decode file data
                        try:
                            file_data = base64.b64decode(file_data_base64)
                            
                            # Save file to temporary location
                            file_id = str(uuid.uuid4())
                            temp_dir = tempfile.gettempdir()
                            file_path = os.path.join(temp_dir, f"{file_id}_{file_name}")
                            
                            with open(file_path, "wb") as f:
                                f.write(file_data)
                            
                            # Store file path
                            uploaded_files[file_id] = file_path
                            logger.debug(f"File saved to {file_path}")
                            print(f"File saved to {file_path}")
                            
                            # Process message with Claude
                            response = await process_message(conversation_id, message_text or "", file_id)
                            logger.debug(f"Sending file response back to client: {response[:50]}...")
                            print(f"Sending file response back to client: {response[:50]}...")
                            
                            # Send response back to client
                            await websocket.send_json({
                                "type": "message",
                                "content": response
                            })
                            
                        except Exception as e:
                            logger.exception("Error processing file upload")
                            print(f"Error processing file: {str(e)}")
                            await websocket.send_json({
                                "type": "error",
                                "content": f"Error processing file upload: {str(e)}"
                            })
                    else:
                        logger.debug("No file data provided")
                        print("No file data provided")
                        await websocket.send_json({
                            "type": "error",
                            "content": "No file data provided"
                        })
                
                elif message_type == "ping":
                    # Ping message to keep connection alive
                    logger.debug("Received ping, sending pong")
                    print("Received ping, sending pong")
                    await websocket.send_json({"type": "pong"})
                
                else:
                    # Unknown message type
                    logger.debug(f"Unknown message type: {message_type}")
                    print(f"Unknown message type: {message_type}")
                    await websocket.send_json({
                        "type": "error",
                        "content": f"Unknown message type: {message_type}"
                    })
            except json.JSONDecodeError:
                logger.exception("Error decoding JSON message")
                print(f"Error decoding JSON message")
                await websocket.send_json({
                    "type": "error",
                    "content": "Error decoding message: invalid JSON"
                })
                    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {conversation_id}")
        print(f"WebSocket client disconnected: {conversation_id}")
    except ConnectionClosedError:
        logger.info(f"WebSocket connection closed: {conversation_id}")
        print(f"WebSocket connection closed: {conversation_id}")
    except Exception as e:
        logger.exception(f"Error in WebSocket connection: {str(e)}")
        print(f"Error in WebSocket connection: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"Server error: {str(e)}"
            })
        except:
            pass
'''

# Create the file locally
with open('/tmp/new_websocket_endpoint.py', 'w') as f:
    f.write(patch_code)

print("💻 Created patch file")

# Copy to container
result = subprocess.run(
    ["docker", "cp", "/tmp/new_websocket_endpoint.py", "nxthumans_ai_cx_workbench-agent-orchestrator-1:/tmp/"],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print(f"❌ Failed to copy file to container: {result.stderr}")
    exit(1)

print("📁 Copied patch to container")

# Execute the patch script inside the container
modify_script = '''
#!/bin/bash
set -e

# Backup original file
cp /app/app.py /app/app.py.backup.$(date +%s)
echo "📂 Created backup of app.py"

# Extract the websocket_endpoint function
START_LINE=$(grep -n "@app.websocket(\"/ws/{conversation_id}\")" /app/app.py | cut -d: -f1)
if [ -z "$START_LINE" ]; then
    echo "❌ Could not find websocket_endpoint in app.py"
    exit 1
fi

# Find the end of the function
END_START=$((START_LINE + 100))  # Look at the next 100 lines
END_LINE=$(tail -n +$START_LINE /app/app.py | head -n 100 | grep -n "^@app" | head -1 | cut -d: -f1)
if [ -z "$END_LINE" ]; then
    # If no next decorator, look for a blank line followed by a def or class
    END_LINE=$(tail -n +$START_LINE /app/app.py | grep -n -A1 "^$" | grep ":.*\\(def\\|class\\)" | head -1 | cut -d: -f1)
fi

if [ -z "$END_LINE" ]; then
    echo "❌ Could not find the end of websocket_endpoint function"
    # Default to 100 lines
    END_LINE=100
fi

REAL_END_LINE=$((START_LINE + END_LINE - 1))
echo "📍 Found websocket_endpoint from line $START_LINE to $REAL_END_LINE"

# Create a temporary file with the modification
head -n $((START_LINE - 1)) /app/app.py > /tmp/app.py.new
cat /tmp/new_websocket_endpoint.py >> /tmp/app.py.new
tail -n +$((REAL_END_LINE + 1)) /app/app.py >> /tmp/app.py.new

# Replace the original file
cp /tmp/app.py.new /app/app.py
echo "✅ Applied patch to app.py"

echo "🔄 Restart the container to apply changes"
'''

# Create the script locally
with open('/tmp/modify_script.sh', 'w') as f:
    f.write(modify_script)

# Copy to container
result = subprocess.run(
    ["docker", "cp", "/tmp/modify_script.sh", "nxthumans_ai_cx_workbench-agent-orchestrator-1:/tmp/"],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print(f"❌ Failed to copy script to container: {result.stderr}")
    exit(1)

# Make the script executable
result = subprocess.run(
    ["docker", "exec", "nxthumans_ai_cx_workbench-agent-orchestrator-1", "chmod", "+x", "/tmp/modify_script.sh"],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print(f"❌ Failed to make script executable: {result.stderr}")
    exit(1)

print("📝 Starting patch process...")

# Run the script
result = subprocess.run(
    ["docker", "exec", "nxthumans_ai_cx_workbench-agent-orchestrator-1", "/tmp/modify_script.sh"],
    capture_output=True,
    text=True
)

print(result.stdout)
if result.returncode != 0:
    print(f"❌ Failed to apply patch: {result.stderr}")
    exit(1)

print("🔄 Restarting container...")

# Restart the container
result = subprocess.run(
    ["docker", "restart", "nxthumans_ai_cx_workbench-agent-orchestrator-1"],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print(f"❌ Failed to restart container: {result.stderr}")
    exit(1)

print("⏱️ Waiting for container to start...")
time.sleep(5)

print("✅ Done! Try the chatbot again now.")
print("💡 If it still doesn't work, restart the launchpad container too:")
print("docker restart nxthumans_ai_cx_workbench-launchpad-1")