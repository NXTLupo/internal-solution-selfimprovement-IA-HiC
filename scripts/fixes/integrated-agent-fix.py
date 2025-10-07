#!/usr/bin/env python3
"""
Integrated Agent Fix for NXT HUMANS AI CX WORKBENCH

This script provides an integrated solution for the WebSocket communication issues
between the chatbot UI and the Claude agent. It:

1. Creates a standalone WebSocket server that bypasses Docker networking issues
2. Automatically injects the WebSocket connection fix into the HTML template
3. Handles proper Claude API integration with error handling
4. Provides detailed logging for diagnostics

Usage:
    python integrated-agent-fix.py [--port PORT] [--api-key API_KEY]

Arguments:
    --port PORT          Port to run the WebSocket server on (default: 8500)
    --api-key API_KEY    Anthropic API key (defaults to environment variable)
"""

import os
import sys
import json
import time
import asyncio
import logging
import argparse
import subprocess
from pathlib import Path
import anthropic
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import aiohttp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('agent-fix.log')
    ]
)
logger = logging.getLogger("integrated-agent-fix")

# Parse command line arguments
parser = argparse.ArgumentParser(description="Integrated Agent Fix for NXT HUMANS AI CX WORKBENCH")
parser.add_argument("--port", type=int, default=8500, help="Port to run the WebSocket server on")
parser.add_argument("--api-key", type=str, default="", help="Anthropic API key")
args = parser.parse_args()

# Set up the API key
ANTHROPIC_API_KEY = args.api_key or os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    logger.error("No Anthropic API key provided. Please provide via --api-key or ANTHROPIC_API_KEY environment variable.")
    sys.exit(1)

# Initialize FastAPI
app = FastAPI()

# Add CORS middleware to allow connections from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Claude client
try:
    claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    logger.info("Successfully initialized Claude client")
except Exception as e:
    logger.error(f"Failed to initialize Claude client: {e}")
    sys.exit(1)

# In-memory storage for conversations
conversations = {}

# Path to the template file
TEMPLATE_PATH = Path("/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/templates/enhanced-index.html")
BACKUP_PATH = TEMPLATE_PATH.with_suffix(".html.bak")

# JavaScript to fix WebSocket connections
FIX_WEBSOCKET_JS = """
<script>
// Fix for WebSocket routing
(function() {
    console.log("[AGENT-FIX] Applying WebSocket fix...");
    
    // Store the original WebSocket constructor
    const OriginalWebSocket = window.WebSocket;
    
    // Override the WebSocket constructor
    window.WebSocket = function(url, protocols) {
        // Check if this is a proxy connection to the agent
        if (url.includes('/ws-proxy/')) {
            // Extract the conversation ID
            const conversationId = url.split('/ws-proxy/')[1];
            // Create direct URL to our standalone agent
            const directUrl = `ws://localhost:8500/ws/${conversationId}`;
            console.log(`[AGENT-FIX] Redirecting WebSocket from ${url} to ${directUrl}`);
            return new OriginalWebSocket(directUrl, protocols);
        }
        // Use original implementation for other connections
        return new OriginalWebSocket(url, protocols);
    };
    
    // Keep the original WebSocket properties
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
    
    // Function to fix existing connections
    window.fixChatbotConnection = function() {
        console.log("[AGENT-FIX] Manually fixing chatbot connection...");
        const chatbotFrame = document.querySelector('.chatbot-frame');
        if (chatbotFrame) {
            // Force reload the iframe to apply our fix
            chatbotFrame.src = chatbotFrame.src;
            return "Chatbot connection fixed! Please wait a moment for it to reconnect.";
        }
        return "Chatbot frame not found. Is it loaded yet?";
    };
    
    console.log("[AGENT-FIX] WebSocket fix applied successfully");
})();
</script>
"""

def inject_websocket_fix():
    """Inject the WebSocket fix into the HTML template"""
    try:
        if not TEMPLATE_PATH.exists():
            logger.error(f"Template file not found: {TEMPLATE_PATH}")
            return False
        
        # Create a backup
        if not BACKUP_PATH.exists():
            with open(TEMPLATE_PATH, 'r') as src, open(BACKUP_PATH, 'w') as dst:
                dst.write(src.read())
            logger.info(f"Created backup of template at {BACKUP_PATH}")
        
        # Read the template
        with open(TEMPLATE_PATH, 'r') as file:
            content = file.read()
            
        # Check if fix is already applied
        if "[AGENT-FIX]" in content:
            logger.info("WebSocket fix is already injected")
            return True
            
        # Inject the fix before the closing </body> tag
        if "</body>" in content:
            modified_content = content.replace("</body>", f"{FIX_WEBSOCKET_JS}\n</body>")
            with open(TEMPLATE_PATH, 'w') as file:
                file.write(modified_content)
            logger.info("Successfully injected WebSocket fix into template")
            return True
        else:
            logger.error("Could not find </body> tag in template")
            return False
    except Exception as e:
        logger.error(f"Error injecting WebSocket fix: {e}")
        return False

# Define the Claude system prompt
SYSTEM_PROMPT = """
You are an NXT HUMANS CX Workbench agent, a helpful AI assistant that provides information about the various tools and services available in the workbench. You can help users understand how to use the platform's features, troubleshoot issues, and provide guidance on using the different applications.

The NXT HUMANS AI CX Workbench includes:
1. Reddit Data Collector - for gathering data from Reddit
2. Social Research Analysis Tool - for analyzing social media data
3. AI Journey Mapper - for creating customer journey maps
4. AI Agent Assistant - that's you!

Try to be helpful, concise, and friendly in your responses.
"""

async def get_claude_response(user_message, conversation_history=None):
    """Get response from Claude API"""
    if conversation_history is None:
        conversation_history = []
    
    try:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]
        
        # Add conversation history
        for msg in conversation_history:
            messages.append(msg)
            
        # Add the current user message
        messages.append({"role": "user", "content": user_message})
        
        # Get response from Claude
        response = claude_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=2000,
            messages=messages
        )
        
        return response.content[0].text
    except Exception as e:
        logger.error(f"Error getting Claude response: {e}")
        return f"I'm sorry, I encountered an error while processing your request. Error details: {str(e)}"

@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {"status": "ok", "message": "Agent WebSocket server is running"}

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time chat"""
    logger.info(f"WebSocket connection attempt for {conversation_id}")
    
    # Initialize conversation if needed
    if conversation_id not in conversations:
        conversations[conversation_id] = []
    
    # Accept the connection
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for {conversation_id}")
    
    # Send initial greeting
    greeting = {
        "type": "message",
        "content": "Hello! I'm your AI assistant for the NXT HUMANS CX Workbench. How can I help you today?"
    }
    await websocket.send_json(greeting)
    
    try:
        while True:
            # Wait for messages from the client
            message = await websocket.receive_text()
            logger.info(f"Received message from {conversation_id}: {message[:100]}...")
            
            try:
                # Parse the message
                data = json.loads(message)
                
                # Check if this is a proper message or a system message
                if data.get("type") == "message":
                    user_message = data.get("content", "")
                    
                    # Send typing indicator
                    await websocket.send_json({"type": "status", "content": "typing"})
                    
                    # Get response from Claude
                    claude_response = await get_claude_response(
                        user_message, 
                        conversations[conversation_id]
                    )
                    
                    # Add messages to conversation history
                    conversations[conversation_id].append({"role": "user", "content": user_message})
                    conversations[conversation_id].append({"role": "assistant", "content": claude_response})
                    
                    # Cap conversation history at 10 messages (5 exchanges)
                    if len(conversations[conversation_id]) > 10:
                        conversations[conversation_id] = conversations[conversation_id][-10:]
                    
                    # Send response back to client
                    response = {
                        "type": "message",
                        "content": claude_response
                    }
                    await websocket.send_json(response)
                    logger.info(f"Sent response to {conversation_id}: {claude_response[:100]}...")
                
                # Handle other message types if needed
                elif data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from {conversation_id}")
                await websocket.send_json({
                    "type": "error",
                    "content": "Invalid message format. Expected JSON."
                })
            except Exception as e:
                logger.error(f"Error processing message from {conversation_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "content": f"Error processing your message: {str(e)}"
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {conversation_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {conversation_id}: {e}")

def verify_workbench_running():
    """Verify if the workbench is running using docker-compose"""
    try:
        result = subprocess.run(
            ["docker", "compose", "-f", "dynamic-compose.yml", "ps", "--format", "json"],
            cwd="/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH",
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            logger.warning("Failed to check if workbench is running. Docker might not be running.")
            return False
        
        data = json.loads(result.stdout)
        running_services = [service for service in data if service.get("State") == "running"]
        
        if not running_services:
            logger.warning("No workbench services are running")
            return False
            
        logger.info(f"Found {len(running_services)} running workbench services")
        return True
    except Exception as e:
        logger.error(f"Error checking workbench status: {e}")
        return False

async def main():
    """Main function to run the integrated fix"""
    print("="*80)
    print(" NXT HUMANS AI CX WORKBENCH - INTEGRATED AGENT FIX ")
    print("="*80)
    print(f"Starting WebSocket server on port {args.port}...")
    
    # Check if API key is valid
    try:
        response = claude_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=10,
            messages=[
                {"role": "user", "content": "Reply with 'OK' only"}
            ]
        )
        if "OK" in response.content[0].text:
            print("✅ Anthropic API key is valid")
        else:
            print("⚠️ Anthropic API key may not be working correctly")
    except Exception as e:
        print(f"❌ Anthropic API key validation failed: {e}")
        sys.exit(1)
    
    # Check if workbench is running
    if verify_workbench_running():
        print("✅ Workbench services are running")
    else:
        print("⚠️ Workbench services may not be running. Fix will still be applied.")
    
    # Inject the WebSocket fix
    if inject_websocket_fix():
        print("✅ WebSocket fix successfully injected into HTML template")
    else:
        print("❌ Failed to inject WebSocket fix")
        
    print("\n✨ Agent fix is ready! WebSocket server starting...\n")
    print("To test the chatbot, open the launchpad in your browser and try sending a message.")
    print("If the chatbot still doesn't respond, open browser DevTools and run:")
    print("   fixChatbotConnection()")
    print("="*80)
    
    # Start the FastAPI server with uvicorn
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=args.port,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(main())