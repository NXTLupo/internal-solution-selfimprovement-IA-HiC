#!/usr/bin/env python3
import asyncio
import websockets
import json
import logging
import sys

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('ws-test-server')

# Keep track of connected clients
CONNECTIONS = set()

async def echo(websocket, path):
    """Handle WebSocket connections and echo messages back"""
    connection_id = id(websocket)
    client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"New connection from {client_info} at path: {path}")
    
    # Add to connections set
    CONNECTIONS.add(websocket)
    
    try:
        # Send a welcome message
        await websocket.send(json.dumps({
            "type": "status",
            "status": "connected",
            "message": f"WebSocket server connected on path {path}"
        }))
        
        # Handle messages
        async for message in websocket:
            logger.info(f"Received message from {client_info}: {message[:100]}{'...' if len(message) > 100 else ''}")
            
            try:
                # Try to parse as JSON
                data = json.loads(message)
                logger.info(f"Parsed JSON: {data}")
                
                # Echo the message back with additional field
                response = {
                    "type": "message" if "type" not in data else data["type"],
                    "content": f"ECHO: {data.get('content', message)}",
                    "received": True
                }
                await websocket.send(json.dumps(response))
                
            except json.JSONDecodeError:
                # Not JSON, just echo back as string
                await websocket.send(json.dumps({
                    "type": "message",
                    "content": f"ECHO: {message}"
                }))
    
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Connection closed from {client_info}: {e}")
    finally:
        # Remove from connections set
        CONNECTIONS.remove(websocket)
        logger.info(f"Connection {client_info} removed. Total active: {len(CONNECTIONS)}")

async def main():
    host = "0.0.0.0"
    port = 7071  # Different from services
    
    # Start the WebSocket server
    logger.info(f"Starting WebSocket test server on ws://{host}:{port}")
    async with websockets.serve(echo, host, port):
        logger.info(f"WebSocket test server running on ws://{host}:{port}")
        logger.info("Test paths to connect with include:")
        logger.info("  - ws://localhost:7071/ws/test")
        logger.info("  - ws://localhost:7071/ws/your-conversation-id")
        logger.info("Waiting for connections...")
        
        # Keep the server running
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)