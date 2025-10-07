"""
Test script for WebSocket connection to the agent with file upload and journey map generation
"""

import asyncio
import websockets
import json
import base64
import os
import sys

async def send_message(websocket, message_type, content):
    """Send a message to the agent"""
    if message_type == "message":
        await websocket.send(json.dumps({
            "type": "message",
            "content": content
        }))
    elif message_type == "file":
        if os.path.exists(content):
            # Read file
            with open(content, "rb") as f:
                file_data = f.read()
            
            # Encode as base64
            file_data_base64 = base64.b64encode(file_data).decode("utf-8")
            
            # Send file
            await websocket.send(json.dumps({
                "type": "file",
                "file": {
                    "name": os.path.basename(content),
                    "data": file_data_base64
                },
                "content": f"I've uploaded {os.path.basename(content)}. Please generate a journey map from this file."
            }))
        else:
            print(f"File {content} not found")
            sys.exit(1)

async def test_websocket():
    """Test WebSocket connection to the agent"""
    # Connect to WebSocket
    async with websockets.connect("ws://localhost:8500/ws/test-conversation") as websocket:
        print("Connected to agent WebSocket")
        
        # Wait for initial message
        response = await websocket.recv()
        print(f"Received: {response}")
        
        # Send a test message
        await send_message(websocket, "message", "Hello, I need to generate a journey map.")
        
        # Wait for response
        response = await websocket.recv()
        print(f"Received: {response}")
        
        # Wait for a moment
        await asyncio.sleep(2)
        
        # Test with a sample file upload
        sample_file = input("Enter the path to a sample file to upload: ")
        if not sample_file:
            sample_file = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-journeymapper/README.md"  # Default test file
            
        await send_message(websocket, "file", sample_file)
        
        # Wait for response
        response = await websocket.recv()
        print(f"Received: {response}")
        
        # Wait for a bit longer
        await asyncio.sleep(5)
        
        # Check the status of the journey
        await send_message(websocket, "message", "What's the status of the journey map generation?")
        
        # Wait for response
        response = await websocket.recv()
        print(f"Received: {response}")
        
        # Keep the connection open for manual testing
        print("\nConnection is kept open. Press Ctrl+C to exit.")
        while True:
            try:
                response = await websocket.recv()
                print(f"Received: {response}")
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {e}")
                break

if __name__ == "__main__":
    asyncio.run(test_websocket())