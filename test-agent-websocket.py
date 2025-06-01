#!/usr/bin/env python3
import asyncio
import websockets
import json
import uuid
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ws-test")

# Test parameters
DIRECT_AGENT_WS_URL = "ws://172.18.0.17:8500"  # Direct IP to agent container
LAUNCHPAD_WS_PROXY_URL = "ws://localhost:8000"  # Launchpad WebSocket proxy

async def test_direct_agent_connection():
    """Test direct connection to agent WebSocket"""
    conversation_id = str(uuid.uuid4())
    ws_url = f"{DIRECT_AGENT_WS_URL}/ws/{conversation_id}"
    
    logger.info(f"Testing direct agent WebSocket connection to: {ws_url}")
    
    try:
        # Connect to WebSocket with timeout
        async with websockets.connect(ws_url, ping_interval=20, ping_timeout=10, close_timeout=5) as websocket:
            logger.info("Connected to agent WebSocket directly!")
            
            # Send a test message
            test_message = {
                "type": "message",
                "content": "Hello, agent! This is a test message."
            }
            
            logger.info(f"Sending test message: {test_message}")
            await websocket.send(json.dumps(test_message))
            
            # Wait for response with timeout
            logger.info("Waiting for response...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                logger.info(f"Received response: {response[:200]}...")
                response_data = json.loads(response)
                
                if response_data.get("type") == "message" and response_data.get("content"):
                    logger.info("✅ Agent responded successfully!")
                    return True, "Agent connection and response successful!"
                else:
                    logger.warning(f"Agent responded with unexpected format: {response_data}")
                    return False, f"Agent responded with unexpected format: {response_data}"
                    
            except asyncio.TimeoutError:
                logger.error("Timeout waiting for agent response")
                return False, "Timeout waiting for agent response"
                
    except ConnectionRefusedError:
        logger.error(f"Connection refused to {ws_url}")
        return False, f"Connection refused to {ws_url}"
        
    except websockets.exceptions.InvalidStatusCode as e:
        logger.error(f"Invalid status code: {e}")
        return False, f"Invalid status code: {e}"
        
    except Exception as e:
        logger.error(f"Error connecting to agent: {e}", exc_info=True)
        return False, f"Error: {e}"

async def test_launchpad_proxy_connection():
    """Test connection through launchpad WebSocket proxy"""
    conversation_id = str(uuid.uuid4())
    ws_url = f"{LAUNCHPAD_WS_PROXY_URL}/ws-proxy/{conversation_id}"
    
    logger.info(f"Testing launchpad proxy WebSocket connection to: {ws_url}")
    
    try:
        # Connect to WebSocket with timeout
        async with websockets.connect(ws_url, ping_interval=20, ping_timeout=10, close_timeout=5) as websocket:
            logger.info("Connected to launchpad WebSocket proxy!")
            
            # First, wait for connection status message
            logger.info("Waiting for initial status message...")
            try:
                status_message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"Received status message: {status_message}")
                
                # Wait a bit more to ensure agent connection is established
                await asyncio.sleep(2.0)
                
                # Send a test message
                test_message = {
                    "type": "message",
                    "content": "Hello, agent! This is a test message via the launchpad proxy."
                }
                
                logger.info(f"Sending test message: {test_message}")
                await websocket.send(json.dumps(test_message))
                
                # Wait for response with timeout
                logger.info("Waiting for response...")
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                logger.info(f"Received response: {response[:200]}...")
                response_data = json.loads(response)
                
                if response_data.get("type") == "message" and response_data.get("content"):
                    logger.info("✅ Agent responded successfully via proxy!")
                    return True, "Proxy connection and response successful!"
                else:
                    logger.warning(f"Agent responded with unexpected format via proxy: {response_data}")
                    return False, f"Agent responded with unexpected format: {response_data}"
                    
            except asyncio.TimeoutError:
                logger.error("Timeout waiting for agent response via proxy")
                return False, "Timeout waiting for agent response"
                
    except ConnectionRefusedError:
        logger.error(f"Connection refused to proxy {ws_url}")
        return False, f"Connection refused to proxy {ws_url}"
        
    except websockets.exceptions.InvalidStatusCode as e:
        logger.error(f"Invalid status code from proxy: {e}")
        return False, f"Invalid status code from proxy: {e}"
        
    except Exception as e:
        logger.error(f"Error connecting to proxy: {e}", exc_info=True)
        return False, f"Error: {e}"

async def main():
    print("====================================")
    print("Agent WebSocket Connection Test Tool")
    print("====================================")
    print()
    
    # Test direct connection
    print("TESTING DIRECT AGENT CONNECTION")
    print("------------------------------")
    direct_success, direct_message = await test_direct_agent_connection()
    print(f"Direct test {'PASSED' if direct_success else 'FAILED'}: {direct_message}")
    print()
    
    # Test proxy connection
    print("TESTING LAUNCHPAD PROXY CONNECTION")
    print("---------------------------------")
    proxy_success, proxy_message = await test_launchpad_proxy_connection()
    print(f"Proxy test {'PASSED' if proxy_success else 'FAILED'}: {proxy_message}")
    print()
    
    # Print overall status
    if direct_success and proxy_success:
        print("✅ ALL TESTS PASSED: WebSocket connections are working correctly!")
    elif direct_success and not proxy_success:
        print("⚠️ PARTIAL SUCCESS: Direct agent connection works, but proxy connection failed!")
        print("This suggests an issue with the launchpad WebSocket proxy implementation.")
    elif not direct_success and proxy_success:
        print("⚠️ PARTIAL SUCCESS: Proxy connection works, but direct connection failed!")
        print("This is unexpected and suggests an issue with direct agent access.")
    else:
        print("❌ ALL TESTS FAILED: Neither direct nor proxy WebSocket connections work!")
        print("This suggests the agent WebSocket server is not running properly.")
    
    return 0 if (direct_success or proxy_success) else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))