#!/usr/bin/env python3
"""
Simple Agent Welcome Fix
-----------------------
Adds a welcome message to the agent's WebSocket endpoint.
"""
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("agent-welcome-fix")

# Configuration
AGENT_CONTAINER = "agent"

def backup_agent_app():
    """Create a backup of the agent app.py file"""
    cmd = f"docker exec {AGENT_CONTAINER} cp /app/app.py /app/app.py.backup"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        logger.info("Created backup of agent app.py")
        return True
    else:
        logger.error(f"Failed to create backup: {result.stderr}")
        return False

def patch_agent_websocket():
    """Patch the agent's WebSocket endpoint to send a welcome message"""
    # Create patch file
    patch_content = """--- app.py.orig	2025-05-28 12:00:00.000000000 +0000
+++ app.py	2025-05-28 12:01:00.000000000 +0000
@@ -541,6 +541,17 @@
     # Initialize conversation if needed
     if conversation_id not in conversations:
         await initialize_conversation(conversation_id)
+
+    # Send a welcome message
+    try:
+        await websocket.send_json({
+            "type": "message",
+            "content": "I'm the NXT Humans Customer Experience Workbench Assistant. I can help you analyze customer experiences using our specialized tools. How can I assist you today?"
+        })
+        logger.info(f"Sent welcome message to conversation {conversation_id}")
+    except Exception as e:
+        logger.error(f"Error sending welcome message: {str(e)}")
+        
     
     try:
         while True:
"""
    
    # Write patch file to container
    cmd = f"docker exec {AGENT_CONTAINER} bash -c \"echo '{patch_content}' > /app/welcome.patch\""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Failed to create patch file: {result.stderr}")
        return False
    
    # Apply patch
    cmd = f"docker exec {AGENT_CONTAINER} bash -c \"cd /app && patch -p0 < welcome.patch\""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        logger.info("Applied welcome message patch")
        return True
    else:
        logger.error(f"Failed to apply patch: {result.stderr}")
        return False

def restart_agent():
    """Restart the agent container"""
    cmd = f"docker restart {AGENT_CONTAINER}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        logger.info(f"Restarted {AGENT_CONTAINER} container")
        return True
    else:
        logger.error(f"Failed to restart container: {result.stderr}")
        return False

def main():
    logger.info("Starting agent welcome fix")
    
    # Check if agent container exists
    cmd = f"docker ps --filter name={AGENT_CONTAINER} --format '{{{{.Names}}}}'"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if not result.stdout.strip():
        logger.error(f"Agent container '{AGENT_CONTAINER}' not found")
        return False
    
    # Backup app.py
    if not backup_agent_app():
        logger.error("Failed to create backup, aborting")
        return False
    
    # Patch WebSocket endpoint
    if not patch_agent_websocket():
        logger.error("Failed to patch WebSocket endpoint, aborting")
        return False
    
    # Restart agent
    if not restart_agent():
        logger.error("Failed to restart agent, changes won't take effect")
        return False
    
    logger.info("Successfully added welcome message to agent WebSocket endpoint")
    logger.info("The agent should now respond properly to chat messages")
    return True

if __name__ == "__main__":
    main()