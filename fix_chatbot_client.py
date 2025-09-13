#!/usr/bin/env python3
"""
Fix Chatbot Client
-----------------
This script fixes the chatbot client to prevent duplicate welcome messages
and ensure proper handling of WebSocket communication.
"""
import os
import subprocess
import logging
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("fix-chatbot-client")

# Path to chatbot.js
CHATBOT_JS_PATH = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/static/chatbot.js"
LAUNCHPAD_CONTAINER = "nxthumans_ai_cx_workbench-launchpad-1"

def fix_chatbot_client():
    """Fix the chatbot client to prevent duplicate welcome messages"""
    # Check if file exists
    if not os.path.exists(CHATBOT_JS_PATH):
        logger.error(f"File not found: {CHATBOT_JS_PATH}")
        return False
    
    # Create backup
    backup_path = f"{CHATBOT_JS_PATH}.backup"
    try:
        with open(CHATBOT_JS_PATH, 'r') as src, open(backup_path, 'w') as dst:
            dst.write(src.read())
        logger.info(f"Created backup at {backup_path}")
    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        return False
    
    # Read file content
    try:
        with open(CHATBOT_JS_PATH, 'r') as f:
            content = f.read()
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        return False
    
    # Fix 1: Remove static welcome message in createConversation
    logger.info("Fixing createConversation method")
    pattern1 = r"// Add welcome message\s+setTimeout\(\(\) => \{\s+this\.addMessage\('assistant', 'Hello.*?\);\s+\}, 500\);"
    replacement1 = "// No static welcome message - will receive from WebSocket"
    content = re.sub(pattern1, replacement1, content)
    
    # Fix 2: Add flag to track initial message in initWebSocket
    logger.info("Fixing initWebSocket method")
    pattern2 = r"// Create WebSocket\s+console\.log\('Creating WebSocket\.\.\.'.*?this\.socket = new WebSocket\(wsUrl\);"
    replacement2 = """// Create WebSocket
      console.log('Creating WebSocket...');
      this.socket = new WebSocket(wsUrl);
      
      // Flag to track if initial message was received
      this.initialMessageReceived = false;"""
    content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)
    
    # Fix 3: Update onmessage handler to track initial message
    logger.info("Fixing WebSocket onmessage handler")
    pattern3 = r"if \(data\.type === 'message'\) \{\s+console\.log\('Received assistant message'\);\s+// Hide typing indicator and add message\s+this\.hideTypingIndicator\(\);\s+this\.addMessage\('assistant', data\.content\);"
    replacement3 = """if (data.type === 'message') {
            console.log('Received assistant message');
            // Hide typing indicator and add message
            this.hideTypingIndicator();
            
            // Track if first message has been received
            if (!this.initialMessageReceived) {
              console.log('Received initial welcome message from server');
              this.initialMessageReceived = true;
            }
            
            this.addMessage('assistant', data.content);"""
    content = re.sub(pattern3, replacement3, content)
    
    # Write fixed content
    try:
        with open(CHATBOT_JS_PATH, 'w') as f:
            f.write(content)
        logger.info(f"Updated {CHATBOT_JS_PATH}")
        return True
    except Exception as e:
        logger.error(f"Error writing file: {e}")
        return False

def copy_to_container():
    """Copy the fixed chatbot.js to the container"""
    try:
        # Check if container is running
        check_cmd = f"docker ps --filter name={LAUNCHPAD_CONTAINER} --format '{{{{.Names}}}}'"
        result = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)
        
        if not result.stdout.strip():
            logger.error(f"Container {LAUNCHPAD_CONTAINER} not found or not running")
            return False
        
        # Copy the file to the container - escape spaces in path
        escaped_path = CHATBOT_JS_PATH.replace(" ", "\\ ")
        copy_cmd = f"docker cp \"{CHATBOT_JS_PATH}\" {LAUNCHPAD_CONTAINER}:/app/static/chatbot.js"
        subprocess.run(copy_cmd, shell=True, check=True)
        logger.info(f"Copied fixed chatbot.js to container")
        
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Error copying file to container: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False

def main():
    logger.info("Starting chatbot client fix")
    
    # Fix the client
    if fix_chatbot_client():
        logger.info("Fixed chatbot client successfully")
    else:
        logger.error("Failed to fix chatbot client")
        return False
    
    # Copy to container
    if copy_to_container():
        logger.info("Copied fixed client to container")
    else:
        logger.error("Failed to copy to container")
        return False
    
    logger.info("Chatbot client fix completed successfully")
    logger.info("The agent should now respond properly to chat messages")
    
    return True

if __name__ == "__main__":
    main()