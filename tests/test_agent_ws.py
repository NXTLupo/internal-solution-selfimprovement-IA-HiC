#!/usr/bin/env python3
"""
WebSocket Test Script for Agent
-------------------------------
This script tests direct WebSocket connections to the agent service.
"""

import os
import json
import asyncio
import requests
import uuid
import argparse
import logging
from urllib.parse import urlparse, urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("test-agent-ws")

# Agent URLs
AGENT_HTTP_URL = os.environ.get("AGENT_HTTP_URL", "http://localhost:8500")
LAUNCHPAD_URL = os.environ.get("LAUNCHPAD_URL", "http://localhost:8000")

def check_anthropic_key():
    """Check if the Anthropic API key is valid"""
    try:
        # First check if we can get the key from the agent service
        response = requests.get(f"{AGENT_HTTP_URL}/health", timeout=5)
        if response.status_code != 200:
            logger.error(f"Agent health check failed: {response.status_code}")
            return False
            
        # Get ENV variables from the agent container
        try:
            cmd = "docker compose -f docker-compose-all.yml exec agent printenv | grep ANTHROPIC"
            import subprocess
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"Agent environment variables:\n{result.stdout}")
                if "ANTHROPIC_API_KEY" in result.stdout:
                    key = result.stdout.split("ANTHROPIC_API_KEY=")[1].split("\n")[0]
                    logger.info(f"Found API key: {key[:5]}...{key[-5:]}")
                    return True
            else:
                logger.error(f"Failed to get agent environment variables: {result.stderr}")
        except Exception as e:
            logger.error(f"Error checking agent environment: {str(e)}")
        
        return False
    except Exception as e:
        logger.error(f"Error checking Anthropic API key: {str(e)}")
        return False

def check_agent_connectivity():
    """Check if the agent service is accessible"""
    try:
        # Check agent HTTP endpoint
        agent_response = requests.get(f"{AGENT_HTTP_URL}/health", timeout=5)
        logger.info(f"Agent HTTP endpoint: {AGENT_HTTP_URL}/health - Status: {agent_response.status_code}")
        
        # Check launchpad HTTP endpoint
        launchpad_response = requests.get(f"{LAUNCHPAD_URL}/health", timeout=5)
        logger.info(f"Launchpad HTTP endpoint: {LAUNCHPAD_URL}/health - Status: {launchpad_response.status_code}")
        
        # Get agent info
        agent_info_response = requests.get(AGENT_HTTP_URL, timeout=5)
        if agent_info_response.status_code == 200:
            agent_info = agent_info_response.json()
            logger.info(f"Agent info: {json.dumps(agent_info, indent=2)}")
        else:
            logger.error(f"Failed to get agent info: {agent_info_response.status_code}")
        
        return agent_response.status_code == 200 and launchpad_response.status_code == 200
    except Exception as e:
        logger.error(f"Error checking agent connectivity: {str(e)}")
        return False

def create_test_conversation():
    """Create a test conversation"""
    try:
        response = requests.post(f"{AGENT_HTTP_URL}/api/chat/conversation", timeout=5)
        if response.status_code == 200:
            conversation_id = response.json().get("conversation_id")
            logger.info(f"Created test conversation: {conversation_id}")
            return conversation_id
        else:
            logger.error(f"Failed to create test conversation: {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"Error creating test conversation: {str(e)}")
        return None

def test_agent_http(conversation_id, message="Hello, can you help me?"):
    """Test the agent HTTP API"""
    try:
        response = requests.post(
            f"{AGENT_HTTP_URL}/api/chat/message",
            data={
                "conversation_id": conversation_id,
                "message": message
            },
            timeout=30  # Longer timeout for Claude processing
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Agent HTTP API response: {result}")
            return True
        else:
            logger.error(f"Agent HTTP API error: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error testing agent HTTP API: {str(e)}")
        return False

async def test_websocket_connection():
    """Test direct WebSocket connection to agent"""
    try:
        # Create a test conversation
        conversation_id = create_test_conversation()
        if not conversation_id:
            return False
            
        # Import websockets library dynamically
        import importlib.util
        spec = importlib.util.find_spec('websockets')
        if spec is None:
            logger.error("websockets library not found. Please install with 'pip install websockets'")
            return False
            
        import websockets
        
        # Get the WebSocket URL
        ws_url = f"{AGENT_HTTP_URL.replace('http://', 'ws://')}/ws/{conversation_id}"
        logger.info(f"Connecting to WebSocket: {ws_url}")
        
        try:
            async with websockets.connect(ws_url) as websocket:
                # Send a ping message
                await websocket.send(json.dumps({
                    "type": "ping"
                }))
                
                # Wait for pong response
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                logger.info(f"Received response: {response}")
                
                # Send a test message
                await websocket.send(json.dumps({
                    "type": "message",
                    "content": "Hello, can you help me?"
                }))
                
                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=30)
                logger.info(f"Received message response: {response}")
                
                return True
        except Exception as e:
            logger.error(f"WebSocket connection error: {str(e)}")
            return False
    except Exception as e:
        logger.error(f"Error in WebSocket test: {str(e)}")
        return False

def check_proxy_websocket():
    """Check proxy WebSocket connection"""
    try:
        # Create a test conversation
        conversation_id = str(uuid.uuid4())
        logger.info(f"Test conversation ID: {conversation_id}")
        
        # Get the WebSocket URL info
        response = requests.get(f"{LAUNCHPAD_URL}/api/chat/ws/{conversation_id}", timeout=5)
        if response.status_code == 200:
            ws_info = response.json()
            logger.info(f"WebSocket info: {ws_info}")
            
            # Check if we get proper WebSocket URL
            ws_url = ws_info.get("ws_url")
            if ws_url:
                proxy_ws_url = urljoin(LAUNCHPAD_URL, f"/ws-proxy/{conversation_id}")
                logger.info(f"Proxy WebSocket URL: {proxy_ws_url}")
                return True
            else:
                logger.error("No WebSocket URL returned")
                return False
        else:
            logger.error(f"Failed to get WebSocket URL: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error checking proxy WebSocket: {str(e)}")
        return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Test agent WebSocket connections")
    parser.add_argument("--skip-ws", action="store_true", help="Skip WebSocket tests (if websockets library not installed)")
    args = parser.parse_args()
    
    # Print test header
    logger.info("=" * 50)
    logger.info("AGENT WEBSOCKET CONNECTION TEST")
    logger.info("=" * 50)
    
    # Check Anthropic API key
    logger.info("\n--- Checking Anthropic API Key ---")
    anthropic_key_valid = check_anthropic_key()
    logger.info(f"Anthropic API key status: {'VALID' if anthropic_key_valid else 'INVALID OR MISSING'}")
    
    # Check agent connectivity
    logger.info("\n--- Checking Agent Connectivity ---")
    agent_accessible = check_agent_connectivity()
    logger.info(f"Agent connectivity status: {'OK' if agent_accessible else 'FAILED'}")
    
    # Test agent HTTP API
    logger.info("\n--- Testing Agent HTTP API ---")
    conversation_id = create_test_conversation()
    if conversation_id:
        http_api_working = test_agent_http(conversation_id)
        logger.info(f"Agent HTTP API status: {'OK' if http_api_working else 'FAILED'}")
    else:
        logger.error("Could not create test conversation, skipping HTTP API test")
        
    # Check proxy WebSocket configuration
    logger.info("\n--- Checking Proxy WebSocket Configuration ---")
    proxy_ws_ok = check_proxy_websocket()
    logger.info(f"Proxy WebSocket configuration: {'OK' if proxy_ws_ok else 'FAILED'}")
    
    # Test WebSocket connection
    if not args.skip_ws:
        try:
            logger.info("\n--- Testing Direct WebSocket Connection ---")
            ws_result = asyncio.run(test_websocket_connection())
            logger.info(f"Direct WebSocket connection: {'OK' if ws_result else 'FAILED'}")
        except ImportError:
            logger.error("websockets library not installed, skipping WebSocket test")
    else:
        logger.info("\n--- Skipping WebSocket Tests ---")
        
    # Print summary
    logger.info("\n" + "=" * 50)
    logger.info("TEST SUMMARY")
    logger.info("=" * 50)
    logger.info(f"Anthropic API key: {'✅ VALID' if anthropic_key_valid else '❌ INVALID OR MISSING'}")
    logger.info(f"Agent connectivity: {'✅ OK' if agent_accessible else '❌ FAILED'}")
    if conversation_id:
        logger.info(f"Agent HTTP API: {'✅ OK' if http_api_working else '❌ FAILED'}")
    else:
        logger.info("Agent HTTP API: ❌ NOT TESTED")
    logger.info(f"Proxy WebSocket: {'✅ OK' if proxy_ws_ok else '❌ FAILED'}")
    if not args.skip_ws:
        logger.info(f"Direct WebSocket: {'✅ OK' if ws_result else '❌ FAILED'}")
    logger.info("=" * 50)

if __name__ == "__main__":
    main()