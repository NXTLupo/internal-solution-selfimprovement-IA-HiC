#!/usr/bin/env python3
import asyncio
import websockets
import json
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("ws-test")

async def test_ws_connection():
    """Test WebSocket connection"""
    conversation_id = "test-debug-connection"
    ws_url = f"ws://localhost:8500/ws/{conversation_id}"
    
    print(f"Connecting to {ws_url}...")
    try:
        async with websockets.connect(ws_url, ping_interval=20) as websocket:
            print("Connected to WebSocket server!")
            
            # Send a test message
            message = {
                "type": "message",
                "content": "Hello, this is a test message. Please reply with a confirmation."
            }
            
            print(f"Sending message: {json.dumps(message)}")
            await websocket.send(json.dumps(message))
            
            # Wait for response with timeout
            print("Waiting for response...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"Received response: {response}")
                return True
            except asyncio.TimeoutError:
                print("Timeout waiting for response after 10 seconds")
                return False
    except Exception as e:
        print(f"Error connecting to WebSocket: {e}")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(test_ws_connection())
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"Exception in main: {e}")
        sys.exit(1)
