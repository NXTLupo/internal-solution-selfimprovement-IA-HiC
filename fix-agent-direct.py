#!/usr/bin/env python3
"""
Emergency fix for the agent orchestrator's direct WebSocket handling
This script uses the bash tool to execute commands inside the agent container
to fix critical issues with message processing
"""

import os
import subprocess
import time
import sys

print("\n🔧 Starting emergency agent orchestrator fix...")

# Helper function to execute commands in the agent container 
def exec_in_agent(command):
    print(f"\n📋 Executing in agent container: {command}")
    result = subprocess.run(
        f"docker exec nxthumans_ai_cx_workbench-agent-orchestrator-1 {command}",
        shell=True, text=True, capture_output=True
    )
    if result.returncode != 0:
        print(f"⚠️ Command failed with error: {result.stderr}")
        return False, result.stderr
    return True, result.stdout

# Ensure we can access the container
success, output = exec_in_agent("ls -la /app")
if not success:
    print("❌ Cannot access agent container. Make sure it's running and try again.")
    sys.exit(1)

print("✅ Successfully connected to agent container")

# Backup the original app.py
success, output = exec_in_agent("cp /app/app.py /app/app.py.bak.emergency")
if not success:
    print("⚠️ Warning: Failed to backup app.py. Proceeding anyway...")
else:
    print("✅ Created backup at /app/app.py.bak.emergency")

# Create a patch file directly in the container
patch_content = """
# Add more detailed logging to websocket_endpoint
@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    \"\"\"WebSocket endpoint for real-time chat\"\"\"
    print(f"WebSocket connection attempt for conversation {conversation_id}")
    await websocket.accept()
    print(f"WebSocket accepted for conversation {conversation_id}")
    
    # Initialize conversation if needed
    if conversation_id not in conversations:
        print(f"Initializing new conversation {conversation_id}")
        await initialize_conversation(conversation_id)
    
    try:
        print(f"Starting message loop for conversation {conversation_id}")
        while True:
            # Receive message from client
            try:
                data = await websocket.receive_json()
                message_type = data.get("type", "")
                print(f"Received {message_type} message from client: {data}")
                
                if message_type == "message":
                    # Regular text message
                    user_message = data.get("content", "")
                    print(f"Processing user message: {user_message[:50]}...")
                    
                    # Process with Claude (use empty string if message is None)
                    response = await process_message(conversation_id, user_message or "")
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
                            print(f"File saved to {file_path}")
                            
                            # Process message with Claude
                            response = await process_message(conversation_id, message_text or "", file_id)
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
                        print("No file data provided")
                        await websocket.send_json({
                            "type": "error",
                            "content": "No file data provided"
                        })
                
                elif message_type == "ping":
                    # Ping message to keep connection alive
                    print("Received ping, sending pong")
                    await websocket.send_json({"type": "pong"})
                
                else:
                    # Unknown message type
                    print(f"Unknown message type: {message_type}")
                    await websocket.send_json({
                        "type": "error",
                        "content": f"Unknown message type: {message_type}"
                    })
            except json.JSONDecodeError:
                print(f"Error decoding JSON message")
                await websocket.send_json({
                    "type": "error",
                    "content": "Error decoding message: invalid JSON"
                })
                    
    except WebSocketDisconnect:
        print(f"WebSocket client disconnected: {conversation_id}")
        logger.info(f"WebSocket client disconnected: {conversation_id}")
    except ConnectionClosedError:
        print(f"WebSocket connection closed: {conversation_id}")
        logger.info(f"WebSocket connection closed: {conversation_id}")
    except Exception as e:
        print(f"Error in WebSocket connection: {str(e)}")
        logger.exception(f"Error in WebSocket connection: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"Server error: {str(e)}"
            })
        except:
            pass
"""

# Create temp patch file
print("Creating patch file...")
with open('/tmp/agent_patch.py', 'w') as f:
    f.write(patch_content)

# Copy patch file to container
success = subprocess.run(
    f"docker cp /tmp/agent_patch.py nxthumans_ai_cx_workbench-agent-orchestrator-1:/app/agent_patch.py",
    shell=True, text=True, capture_output=True
).returncode == 0

if not success:
    print("❌ Failed to copy patch file to container")
    sys.exit(1)

# Apply the patch using sed
print("Applying patch to app.py...")
success, output = exec_in_agent(
    r"sed -i -e '/WebSocket endpoint for real-time chat/, /    except Exception as e:/c\\    \"\"\"WebSocket endpoint for real-time chat\"\"\"\n    print(f\"WebSocket connection attempt for conversation {conversation_id}\")\n    await websocket.accept()\n    print(f\"WebSocket accepted for conversation {conversation_id}\")\n    \n    # Initialize conversation if needed\n    if conversation_id not in conversations:\n        print(f\"Initializing new conversation {conversation_id}\")\n        await initialize_conversation(conversation_id)\n    \n    try:\n        print(f\"Starting message loop for conversation {conversation_id}\")\n        while True:\n            # Receive message from client\n            try:\n                data = await websocket.receive_json()\n                message_type = data.get(\"type\", \"\")\n                print(f\"Received {message_type} message from client: {data}\")\n                \n                if message_type == \"message\":\n                    # Regular text message\n                    user_message = data.get(\"content\", \"\")\n                    print(f\"Processing user message: {user_message[:50]}...\")\n                    \n                    # Process with Claude (use empty string if message is None)\n                    response = await process_message(conversation_id, user_message or \"\")\n                    print(f\"Sending response back to client: {response[:50]}...\")\n                    \n                    # Send response back to client\n                    await websocket.send_json({\n                        \"type\": \"message\",\n                        \"content\": response\n                    })\n                    \n                elif message_type == \"file\":\n                    # File upload message\n                    file_data_base64 = data.get(\"file\", {}).get(\"data\", \"\")\n                    file_name = data.get(\"file\", {}).get(\"name\", \"unnamed_file\")\n                    message_text = data.get(\"content\", \"\")\n                    print(f\"Processing file upload: {file_name}\")\n                    \n                    if file_data_base64:\n                        # Decode file data\n                        try:\n                            file_data = base64.b64decode(file_data_base64)\n                            \n                            # Save file to temporary location\n                            file_id = str(uuid.uuid4())\n                            temp_dir = tempfile.gettempdir()\n                            file_path = os.path.join(temp_dir, f\"{file_id}_{file_name}\")\n                            \n                            with open(file_path, \"wb\") as f:\n                                f.write(file_data)\n                            \n                            # Store file path\n                            uploaded_files[file_id] = file_path\n                            print(f\"File saved to {file_path}\")\n                            \n                            # Process message with Claude\n                            response = await process_message(conversation_id, message_text or \"\", file_id)\n                            print(f\"Sending file response back to client: {response[:50]}...\")\n                            \n                            # Send response back to client\n                            await websocket.send_json({\n                                \"type\": \"message\",\n                                \"content\": response\n                            })\n                            \n                        except Exception as e:\n                            logger.exception(\"Error processing file upload\")\n                            print(f\"Error processing file: {str(e)}\")\n                            await websocket.send_json({\n                                \"type\": \"error\",\n                                \"content\": f\"Error processing file upload: {str(e)}\"\n                            })\n                    else:\n                        print(\"No file data provided\")\n                        await websocket.send_json({\n                            \"type\": \"error\",\n                            \"content\": \"No file data provided\"\n                        })\n                \n                elif message_type == \"ping\":\n                    # Ping message to keep connection alive\n                    print(\"Received ping, sending pong\")\n                    await websocket.send_json({\"type\": \"pong\"})\n                \n                else:\n                    # Unknown message type\n                    print(f\"Unknown message type: {message_type}\")\n                    await websocket.send_json({\n                        \"type\": \"error\",\n                        \"content\": f\"Unknown message type: {message_type}\"\n                    })\n            except json.JSONDecodeError:\n                print(f\"Error decoding JSON message\")\n                await websocket.send_json({\n                    \"type\": \"error\",\n                    \"content\": \"Error decoding message: invalid JSON\"\n                })\n                    \n    except WebSocketDisconnect:\n        print(f\"WebSocket client disconnected: {conversation_id}\")\n        logger.info(f\"WebSocket client disconnected: {conversation_id}\")\n    except ConnectionClosedError:\n        print(f\"WebSocket connection closed: {conversation_id}\")\n        logger.info(f\"WebSocket connection closed: {conversation_id}\")\n    except Exception as e:' /app/app.py"
)

# Restart the agent container
print("\n🔄 Restarting agent-orchestrator container...")
restart_result = subprocess.run(
    "docker restart nxthumans_ai_cx_workbench-agent-orchestrator-1",
    shell=True, text=True, capture_output=True
)

if restart_result.returncode != 0:
    print(f"⚠️ Warning: Failed to restart container: {restart_result.stderr}")
else:
    print("✅ Agent container restarted successfully")

print("\n⏱️  Waiting for container to initialize (10 seconds)...")
time.sleep(10)

# Verify the fix
success, output = exec_in_agent("ps aux | grep python")
if "app.py" in output:
    print("✅ Agent process is running properly")
else:
    print("⚠️ Warning: Agent process might not be running correctly")

print("\n✅ Fix complete! Please try the chatbot again.")
print("If issues persist, you may need to restart the launchpad container as well:")
print("docker restart nxthumans_ai_cx_workbench-launchpad-1")