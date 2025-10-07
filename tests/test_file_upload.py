#!/usr/bin/env python3
"""
WebSocket File Upload Test Client for NXT HUMANS AI CX Workbench

This script tests the file upload functionality via WebSocket connection
to verify that the agent can properly handle file uploads.
"""

import asyncio
import websockets
import json
import base64
import argparse
import logging
import sys
import os
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("file-upload-test")

async def test_file_upload(ws_url, file_path, use_direct=False, wait_time=30):
    """Test file upload via WebSocket connection"""
    # Generate conversation ID if not in URL
    if "{conversation_id}" in ws_url:
        conversation_id = str(uuid.uuid4())
        ws_url = ws_url.format(conversation_id=conversation_id)
        logger.info(f"Generated conversation ID: {conversation_id}")
    
    # Create direct URL if requested
    if use_direct:
        conversation_id = ws_url.split("/")[-1]
        ws_url = f"ws://localhost:8500/ws/{conversation_id}"
    
    logger.info(f"Connecting to {ws_url}...")
    
    try:
        # Connect to WebSocket
        async with websockets.connect(
            ws_url, 
            ping_interval=20, 
            ping_timeout=10,
            close_timeout=5,
            max_size=10485760
        ) as websocket:
            logger.info("Connected successfully!")
            
            # Send a ping message
            ping_msg = {"type": "ping"}
            logger.info(f"Sending ping: {ping_msg}")
            await websocket.send(json.dumps(ping_msg))
            
            # Wait for pong response
            try:
                pong = await asyncio.wait_for(websocket.recv(), timeout=5)
                logger.info(f"Received pong: {pong}")
            except asyncio.TimeoutError:
                logger.warning("No response to ping after 5 seconds")
            
            # Read and encode the file
            if not os.path.exists(file_path):
                logger.error(f"File does not exist: {file_path}")
                return False
            
            with open(file_path, "rb") as f:
                file_data = f.read()
                
            # Get file name
            file_name = os.path.basename(file_path)
            
            # Encode file to base64
            file_data_base64 = base64.b64encode(file_data).decode("utf-8")
            logger.info(f"File encoded to base64: {len(file_data_base64)} bytes")
            
            # Create file upload message
            file_msg = {
                "type": "file",
                "file": {
                    "name": file_name,
                    "data": file_data_base64
                },
                "content": f"Please analyze this file: {file_name}"
            }
            logger.info(f"Sending file: {file_name} ({len(file_data)} bytes)")
            
            # Send file message
            await websocket.send(json.dumps(file_msg))
            logger.info("File sent successfully")
            
            # Wait for response
            logger.info(f"Waiting up to {wait_time} seconds for response...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=wait_time)
                logger.info(f"Received response: {response[:500]}...")
                
                # Parse response to see if it's valid
                try:
                    data = json.loads(response)
                    if data.get("type") == "message" and data.get("content"):
                        logger.info("Received valid message response")
                        return True
                    else:
                        logger.warning(f"Received response of type: {data.get('type')}")
                        if data.get("type") == "error":
                            logger.error(f"Error: {data.get('content')}")
                        return False
                except json.JSONDecodeError:
                    logger.error("Received invalid JSON response")
                    return False
            except asyncio.TimeoutError:
                logger.error(f"No response received after {wait_time} seconds")
                return False
    except Exception as e:
        logger.error(f"Error connecting to WebSocket: {str(e)}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WebSocket File Upload Test Client")
    parser.add_argument("--file", required=True, help="Path to file to upload")
    parser.add_argument("--direct", action="store_true", help="Use direct connection to agent")
    parser.add_argument("--conversation-id", help="Conversation ID to use")
    parser.add_argument("--wait", type=int, default=30, help="Maximum time to wait for response (seconds)")
    args = parser.parse_args()
    
    # Generate a random conversation ID if not provided
    conversation_id = args.conversation_id or str(uuid.uuid4())
    
    # Create WebSocket URL
    if args.direct:
        ws_url = f"ws://localhost:8500/ws/{conversation_id}"
        connection_type = "direct"
    else:
        ws_url = f"ws://localhost:8000/ws-proxy/{conversation_id}"
        connection_type = "proxy"
    
    # Print test configuration
    print(f"File Upload Test Configuration:")
    print(f"  File: {args.file}")
    print(f"  Conversation ID: {conversation_id}")
    print(f"  Connection mode: {connection_type}")
    print(f"  WebSocket URL: {ws_url}")
    print(f"  Maximum wait time: {args.wait} seconds")
    print()
    
    # Run the test
    success = asyncio.run(test_file_upload(ws_url, args.file, args.direct, args.wait))
    
    # Print result
    if success:
        print("\n✅ File upload test completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ File upload test failed!")
        sys.exit(1)