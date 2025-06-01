#!/usr/bin/env python3
"""
Fix Agent Message Handling
-------------------------
This script fixes the agent's message handling to ensure it properly responds after initial greeting.
"""

import os
import sys
import logging
import subprocess
import json
import argparse
import requests
import time
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("fix-agent-message-handling")

# Configuration
AGENT_CONTAINER_NAME = os.environ.get("AGENT_CONTAINER_NAME", "agent")
LAUNCHPAD_CONTAINER_NAME = os.environ.get("LAUNCHPAD_CONTAINER_NAME", "nxthumans_ai_cx_workbench-launchpad-1")

def run_command(cmd, description=None):
    """Run a shell command and return the output"""
    if description:
        logger.info(f"Running: {description}")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            logger.error(f"Command failed: {result.stderr}")
            return None
    except Exception as e:
        logger.error(f"Error running command: {str(e)}")
        return None

def check_container_status(container_name):
    """Check if a container is running"""
    cmd = f"docker inspect --format='{{{{.State.Status}}}}' {container_name} 2>/dev/null || echo 'not_found'"
    status = run_command(cmd)
    
    if status == "running":
        logger.info(f"Container {container_name} is running")
        return True
    elif status == "not_found":
        logger.error(f"Container {container_name} not found")
    else:
        logger.error(f"Container {container_name} is {status}")
    
    return False

def fix_agent_websocket_implementation():
    """Fix the agent's WebSocket implementation to ensure proper message handling"""
    # Check if agent container is running
    if not check_container_status(AGENT_CONTAINER_NAME):
        logger.error(f"Agent container '{AGENT_CONTAINER_NAME}' is not running")
        return False
    
    # Path to app.py inside the container
    container_app_path = "/app/app.py"
    
    # Create a backup of the original file
    logger.info("Creating backup of agent app.py")
    subprocess.run(
        ["docker", "exec", AGENT_CONTAINER_NAME, "cp", container_app_path, "/app/app.py.bak"],
        check=True
    )
    
    # First, extract the current file
    logger.info("Extracting current app.py from agent container")
    result = subprocess.run(
        ["docker", "exec", AGENT_CONTAINER_NAME, "cat", container_app_path],
        capture_output=True,
        text=True,
        check=True
    )
    
    original_content = result.stdout
    
    # Patching the WebSocket endpoint to handle connections properly
    search_pattern = '@app.websocket("/ws/{conversation_id}")'
    
    # Create the patched version of app.py
    # First, add import for asyncio.wait_for if not already present
    if "import asyncio" not in original_content:
        logger.info("Adding asyncio import")
        new_content = original_content.replace(
            "import requests",
            "import requests\nimport asyncio"
        )
    else:
        new_content = original_content

    # Replace the WebSocket endpoint with our enhanced version
    logger.info("Patching WebSocket endpoint function")
    websocket_endpoint_pattern = '@app.websocket("/ws/{conversation_id}")'
    endpoint_index = new_content.find(websocket_endpoint_pattern)
    
    if endpoint_index == -1:
        logger.error("Could not find WebSocket endpoint function in app.py")
        return False
    
    # Find the function definition and the first part that we want to replace
    function_start = endpoint_index
    message_type_index = new_content.find('message_type = data.get("type", "")', function_start)
    
    if message_type_index == -1:
        logger.error("Could not find message_type line in WebSocket endpoint function")
        return False
    
    # Extract the code to replace
    code_to_replace = new_content[function_start:message_type_index + len('message_type = data.get("type", "")')]
    
    # Define our enhanced implementation
    enhanced_implementation = '''@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time chat"""
    logger.info(f"WebSocket connection request for conversation: {conversation_id}")
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for conversation: {conversation_id}")
    
    # Initialize conversation if needed
    if conversation_id not in conversations:
        logger.info(f"Initializing conversation: {conversation_id}")
        await initialize_conversation(conversation_id)
        
    # Send initial greeting
    logger.info(f"Sending initial greeting for conversation: {conversation_id}")
    try:
        await websocket.send_json({
            "type": "message",
            "content": "I'm the NXT Humans Customer Experience Workbench Assistant. I can help you analyze customer experiences using our specialized tools. How can I assist you today?"
        })
        logger.info("Initial greeting sent successfully")
    except Exception as e:
        logger.error(f"Error sending initial greeting: {str(e)}")
    
    try:
        # Set up a ping task to keep the connection alive
        async def send_periodic_ping():
            ping_interval = 20  # seconds
            while True:
                try:
                    await asyncio.sleep(ping_interval)
                    logger.debug(f"Sending ping for conversation: {conversation_id}")
                    await websocket.send_json({"type": "ping"})
                except Exception as e:
                    logger.error(f"Error sending ping: {str(e)}")
                    break
        
        # Start ping task
        ping_task = asyncio.create_task(send_periodic_ping())
        
        while True:
            # Receive message from client with timeout to handle disconnections
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
                logger.info(f"Received message for conversation {conversation_id}: {str(data)[:100]}...")
                message_type = data.get("type", "")'''
    
    # Replace the code
    new_content = new_content.replace(code_to_replace, enhanced_implementation)
    logger.info("Successfully patched WebSocket endpoint function")
    
    # Find the exception handling block to enhance
    exception_block_start = new_content.find("    except WebSocketDisconnect:")
    if exception_block_start == -1:
        logger.warning("Could not find exception handling block to enhance")
    else:
        # Find the end of the exception block
        block_parts = [
            "    except WebSocketDisconnect:",
            "    except ConnectionClosedError:",
            "    except Exception as e:"
        ]
        
        block_end_index = -1
        for part in block_parts:
            part_index = new_content.find(part, exception_block_start)
            if part_index != -1:
                next_block = new_content.find("    except", part_index + len(part))
                if next_block == -1:
                    # This is the last exception block
                    try_index = new_content.find("    try:", part_index + len(part))
                    if try_index == -1:
                        # No try block after this, find the end of the function
                        next_at_index = new_content.find("@app", part_index + len(part))
                        if next_at_index == -1:
                            # This is the last function, go to the end of the file
                            block_end_index = len(new_content)
                        else:
                            block_end_index = next_at_index
                    else:
                        block_end_index = try_index
                else:
                    block_end_index = next_block
        
        if block_end_index != -1:
            # Extract the exception block
            exception_block = new_content[exception_block_start:block_end_index]
            
            # Check if there's a finally clause
            if "    finally:" in exception_block:
                logger.info("Finally clause already exists in exception block")
            else:
                # Add finally clause to clean up ping task
                enhanced_exception_block = exception_block + '''    finally:
        # Cancel ping task if it exists
        try:
            if 'ping_task' in locals():
                ping_task.cancel()
                logger.info(f"Ping task cancelled for conversation: {conversation_id}")
        except Exception as e:
            logger.error(f"Error cancelling ping task: {str(e)}")
'''
                
                # Replace the exception block
                new_content = new_content.replace(exception_block, enhanced_exception_block)
                logger.info("Added finally clause to exception handling block")
    except Exception as e:
        logger.exception(f"Error in WebSocket connection: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"Server error: {str(e)}"
            })
        except:
            pass""",
        
        """    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {conversation_id}")
    except ConnectionClosedError:
        logger.info(f"WebSocket connection closed: {conversation_id}")
    except Exception as e:
        logger.exception(f"Error in WebSocket connection: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"Server error: {str(e)}"
            })
        except:
            pass
    finally:
        # Cancel ping task if it exists
        try:
            if 'ping_task' in locals():
                ping_task.cancel()
                logger.info(f"Ping task cancelled for conversation: {conversation_id}")
        except Exception as e:
            logger.error(f"Error cancelling ping task: {str(e)}")"""
    )
    
    # Write the new content to a temporary file inside the container
    logger.info("Writing patched app.py to agent container")
    patch_file_path = "/app/app.py.new"
    
    # Use a temporary file approach for reliability
    with open("temp_agent_app.py", "w") as f:
        f.write(new_content)
    
    # Copy the file to the container
    subprocess.run(
        ["docker", "cp", "temp_agent_app.py", f"{AGENT_CONTAINER_NAME}:{patch_file_path}"],
        check=True
    )
    os.remove("temp_agent_app.py")
    
    # Replace the original file
    logger.info("Replacing original app.py with patched version")
    subprocess.run(
        ["docker", "exec", AGENT_CONTAINER_NAME, "cp", patch_file_path, container_app_path],
        check=True
    )
    
    # Restart the agent service inside the container
    logger.info("Restarting the agent service")
    subprocess.run(
        ["docker", "restart", AGENT_CONTAINER_NAME],
        check=True
    )
    
    logger.info("Waiting for agent service to restart...")
    time.sleep(5)
    
    logger.info("Agent service restarted with improved message handling")
    return True

def inject_client_fallback():
    """Inject a client-side fallback for WebSocket connection issues"""
    # Check if launchpad container is running
    if not check_container_status(LAUNCHPAD_CONTAINER_NAME):
        logger.error(f"Launchpad container '{LAUNCHPAD_CONTAINER_NAME}' is not running")
        return False
    
    # Copy the enhanced WebSocket client to launchpad container
    client_js_path = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/static/enhanced-websocket-client.js"
    if os.path.exists(client_js_path):
        logger.info("Copying enhanced WebSocket client to launchpad container")
        subprocess.run(
            ["docker", "cp", client_js_path, f"{LAUNCHPAD_CONTAINER_NAME}:/app/static/"],
            check=True
        )
    else:
        logger.error(f"Enhanced WebSocket client not found at {client_js_path}")
        return False
    
    # Update the agent-embed.html template to use the enhanced client
    container_template_path = "/app/templates/agent-embed.html"
    
    # Extract current template
    logger.info("Extracting current agent-embed.html from launchpad container")
    result = subprocess.run(
        ["docker", "exec", LAUNCHPAD_CONTAINER_NAME, "cat", container_template_path],
        capture_output=True,
        text=True,
        check=True
    )
    
    original_html = result.stdout
    
    # Check if the enhanced client is already included
    if "enhanced-websocket-client.js" in original_html:
        logger.info("Enhanced WebSocket client already included in agent-embed.html")
    else:
        # Add enhanced client script and initialization code
        new_html = original_html.replace(
            "</head>",
            """<script src="/static/enhanced-websocket-client.js"></script>
<script>
// Initialize enhanced agent connection when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Create a new connection with debug enabled
    window.agentConnection = new EnhancedAgentConnection({
        debug: true,
        onMessage: function(message) {
            // Add message to chat
            const messagesDiv = document.getElementById('messages');
            const messageElement = document.createElement('div');
            messageElement.className = 'message agent-message';
            messageElement.innerHTML = `<p>${message}</p>`;
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        },
        onStatus: function(status) {
            console.log('Agent status:', status);
            // Update status in UI if needed
            const statusElement = document.getElementById('status');
            if (statusElement) {
                statusElement.textContent = status.message || status.status;
            }
        },
        onError: function(error) {
            console.error('Agent error:', error);
            // Show error in UI
            const messagesDiv = document.getElementById('messages');
            const errorElement = document.createElement('div');
            errorElement.className = 'message error-message';
            errorElement.innerHTML = `<p>Error: ${error}</p>`;
            messagesDiv.appendChild(errorElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        },
        onConnected: function(info) {
            console.log('Connected to agent:', info);
            // Enable input when connected
            document.getElementById('message-input').disabled = false;
            document.getElementById('send-button').disabled = false;
        },
        onDisconnected: function(info) {
            console.log('Disconnected from agent:', info);
            // Disable input when disconnected
            document.getElementById('message-input').disabled = true;
            document.getElementById('send-button').disabled = true;
        }
    });
    
    // Initialize the connection
    agentConnection.initialize().catch(function(error) {
        console.error('Failed to initialize agent connection:', error);
    });
    
    // Override the existing sendMessage function to use the enhanced client
    window.sendMessage = function() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (message) {
            // Add user message to chat
            const messagesDiv = document.getElementById('messages');
            const messageElement = document.createElement('div');
            messageElement.className = 'message user-message';
            messageElement.innerHTML = `<p>${message}</p>`;
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Clear input
            messageInput.value = '';
            
            // Send message to agent
            if (window.agentConnection) {
                agentConnection.sendMessage(message).catch(function(error) {
                    console.error('Error sending message:', error);
                });
            } else {
                console.error('Agent connection not initialized');
            }
        }
    };
});
</script>
</head>"""
        )
        
        # Write the updated HTML to a temporary file
        with open("temp_agent_embed.html", "w") as f:
            f.write(new_html)
        
        # Copy the file to the container
        logger.info("Updating agent-embed.html in launchpad container")
        subprocess.run(
            ["docker", "cp", "temp_agent_embed.html", f"{LAUNCHPAD_CONTAINER_NAME}:{container_template_path}"],
            check=True
        )
        os.remove("temp_agent_embed.html")
    
    # Restart the launchpad service
    logger.info("Restarting launchpad service")
    subprocess.run(
        ["docker", "restart", LAUNCHPAD_CONTAINER_NAME],
        check=True
    )
    
    logger.info("Waiting for launchpad service to restart...")
    time.sleep(5)
    
    logger.info("Client-side fallback injected successfully")
    return True

def main():
    parser = argparse.ArgumentParser(description="Fix agent message handling issues")
    parser.add_argument("--force", action="store_true", help="Force apply fixes even if not needed")
    args = parser.parse_args()
    
    logger.info("Starting agent message handling fix")
    
    # Check if agent container is running
    if not check_container_status(AGENT_CONTAINER_NAME):
        logger.error("Agent container is not running, cannot continue")
        return 1
    
    # Check if launchpad container is running
    if not check_container_status(LAUNCHPAD_CONTAINER_NAME):
        logger.error("Launchpad container is not running, cannot continue")
        return 1
    
    # Fix agent WebSocket implementation
    logger.info("Fixing agent WebSocket implementation")
    if fix_agent_websocket_implementation():
        logger.info("Agent WebSocket implementation fixed successfully")
    else:
        logger.error("Failed to fix agent WebSocket implementation")
        return 1
    
    # Inject client-side fallback
    logger.info("Injecting client-side fallback")
    if inject_client_fallback():
        logger.info("Client-side fallback injected successfully")
    else:
        logger.error("Failed to inject client-side fallback")
        return 1
    
    logger.info("Agent message handling fix completed")
    logger.info("Please try accessing the agent again - it should now respond properly after the initial greeting")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())