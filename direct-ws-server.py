#!/usr/bin/env python3
"""
Direct WebSocket server to handle agent requests
This provides a standalone alternative to the Docker-based agent
"""
import asyncio
import json
import logging
import os
import uuid
import sys
from datetime import datetime
import signal

try:
    import fastapi
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    import uvicorn
except ImportError:
    print("Required packages not found. Installing...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "fastapi", "uvicorn", "websockets", "pydantic"])
    import fastapi
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("agent_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("direct-ws-server")

# Create FastAPI app
app = FastAPI(
    title="Direct WebSocket Server",
    description="Simple WebSocket server for testing the chatbot",
)

# Store active conversations
conversations = {}

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Direct WebSocket Server starting up")
    
    # Log server configuration
    logger.info(f"Server port: {os.environ.get('PORT', '8500')}")
    
    # Log API info if available
    anthropic_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if anthropic_key:
        logger.info(f"ANTHROPIC_API_KEY: {anthropic_key[:8]}...{anthropic_key[-4:]}")
        logger.info(f"ANTHROPIC_MODEL: {os.environ.get('ANTHROPIC_MODEL', 'Not set')}")

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Direct WebSocket Server",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "/ws/{conversation_id}": "WebSocket endpoint for real-time chat"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "direct-ws-server"}

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time chat"""
    logger.info(f"WebSocket connection attempt for {conversation_id}")
    
    # Accept the connection
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for {conversation_id}")
    print(f"Client connected: {conversation_id}")
    
    # Initialize conversation if needed
    if conversation_id not in conversations:
        logger.info(f"Creating new conversation: {conversation_id}")
        conversations[conversation_id] = {
            "id": conversation_id,
            "messages": [],
            "created_at": datetime.now().isoformat()
        }
    
    # Store welcome message
    welcome_message = "Hello! I'm your CX Workbench Assistant (Direct Server Mode). How can I help you today?"
    
    # Send welcome message
    await websocket.send_json({
        "type": "message",
        "content": welcome_message
    })
    
    try:
        # Message processing loop
        while True:
            # Receive message from client
            try:
                data = await websocket.receive_json()
                logger.info(f"Received message from client: {data}")
                print(f"Received: {json.dumps(data)[:100]}...")
                
                message_type = data.get("type", "")
                
                if message_type == "message":
                    # Get user message
                    user_message = data.get("content", "")
                    logger.info(f"Processing user message: {user_message[:50]}...")
                    
                    # Store the message
                    conversations[conversation_id]["messages"].append({
                        "role": "user",
                        "content": user_message
                    })
                    
                    # Prepare response
                    response = "I've received your message and I'm here to help with the CX Workbench. " + \
                              "This is coming from the direct WebSocket server (bypassing Docker). " + \
                              f"You said: {user_message}"
                    
                    # Store response
                    conversations[conversation_id]["messages"].append({
                        "role": "assistant",
                        "content": response
                    })
                    
                    # Send response
                    logger.info(f"Sending response: {response[:50]}...")
                    await websocket.send_json({
                        "type": "message",
                        "content": response
                    })
                
                elif message_type == "file":
                    # Handle file upload
                    file_info = data.get("file", {})
                    message_text = data.get("content", "")
                    
                    file_name = file_info.get("name", "unnamed_file")
                    logger.info(f"Received file upload: {file_name}")
                    
                    # Send acknowledgement
                    response = f"I've received your file '{file_name}' and the message: {message_text}"
                    await websocket.send_json({
                        "type": "message",
                        "content": response
                    })
                
                elif message_type == "ping":
                    # Respond to ping with pong
                    logger.debug("Received ping, sending pong")
                    await websocket.send_json({"type": "pong"})
                
                else:
                    # Unknown message type
                    logger.warning(f"Unknown message type: {message_type}")
                    await websocket.send_json({
                        "type": "error",
                        "content": f"Unknown message type: {message_type}"
                    })
            
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON: {e}")
                await websocket.send_json({
                    "type": "error",
                    "content": "Invalid JSON message"
                })
    
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {conversation_id}")
        print(f"Client disconnected: {conversation_id}")
    except Exception as e:
        logger.exception(f"Error in WebSocket connection: {e}")
        print(f"Error in WebSocket connection: {e}")

def signal_handler(sig, frame):
    """Handle Ctrl+C"""
    print("\nShutting down server...")
    sys.exit(0)

def main():
    """Start the server"""
    # Set up signal handling
    signal.signal(signal.SIGINT, signal_handler)
    
    # Get port from environment or use default
    port = int(os.environ.get("PORT", 8500))
    
    print(f"\n{'='*60}")
    print(f"Starting Direct WebSocket Server on port {port}")
    print(f"{'='*60}\n")
    
    # Start the server
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="debug")

if __name__ == "__main__":
    main()