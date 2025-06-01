#!/usr/bin/env python3
"""
Direct Agent Welcome Fix
-----------------------
Modifies the agent's app.py to add a welcome message.
"""
import subprocess
import os
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("agent-fix")

# Original and replacement code
ORIGINAL_CODE = """    # Initialize conversation if needed
    if conversation_id not in conversations:
        await initialize_conversation(conversation_id)
    
    try:"""

WELCOME_CODE = """    # Initialize conversation if needed
    if conversation_id not in conversations:
        await initialize_conversation(conversation_id)
        
    # Send initial welcome message
    logger.info(f"Sending welcome message to conversation {conversation_id}")
    try:
        await websocket.send_json({
            "type": "message",
            "content": "I'm the NXT Humans Customer Experience Workbench Assistant. I can help you analyze customer experiences using our specialized tools. How can I assist you today?"
        })
    except Exception as e:
        logger.error(f"Error sending welcome message: {str(e)}")
    
    try:"""

def main():
    # Container name
    container_name = "agent"
    
    # Check if container is running
    check_cmd = f"docker ps --filter name={container_name} --format '{{{{.Names}}}}'"
    result = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)
    
    if not result.stdout.strip():
        logger.error(f"Container {container_name} not found or not running")
        return False
    
    # Create backup
    backup_cmd = f"docker exec {container_name} cp /app/app.py /app/app.py.backup"
    subprocess.run(backup_cmd, shell=True, check=True)
    logger.info("Created backup of app.py")
    
    # Get current app.py content
    cat_cmd = f"docker exec {container_name} cat /app/app.py"
    result = subprocess.run(cat_cmd, shell=True, capture_output=True, text=True, check=True)
    original_content = result.stdout
    
    # Replace the code
    modified_content = original_content.replace(ORIGINAL_CODE, WELCOME_CODE)
    
    # Save modified content to temporary file
    with open("temp_app.py", "w") as f:
        f.write(modified_content)
    
    # Copy modified file to container
    copy_cmd = f"docker cp temp_app.py {container_name}:/app/app.py"
    subprocess.run(copy_cmd, shell=True, check=True)
    logger.info("Copied modified app.py to container")
    
    # Clean up
    os.remove("temp_app.py")
    
    # Restart the container
    restart_cmd = f"docker restart {container_name}"
    subprocess.run(restart_cmd, shell=True, check=True)
    logger.info(f"Restarted container {container_name}")
    
    # Wait for restart
    time.sleep(5)
    logger.info("Agent WebSocket welcome message has been added")
    logger.info("The agent should now respond properly to chat messages")
    
    return True

if __name__ == "__main__":
    main()