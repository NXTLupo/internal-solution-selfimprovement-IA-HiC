#!/usr/bin/env python3
"""
Agent Tools Refresh Script
-------------------------
This script forces the agent to refresh its tool definitions by connecting to
the agent service and sending a refresh command.
"""

import os
import sys
import json
import logging
import asyncio
import argparse
import requests
import websockets
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("agent-tools-refresh")

# Agent configuration
AGENT_WS_URL = os.environ.get("AGENT_WS_URL", "ws://localhost:8500")
AGENT_HTTP_URL = os.environ.get("AGENT_HTTP_URL", "http://localhost:8500")

async def refresh_tools_ws():
    """Refresh agent tools using WebSocket connection."""
    try:
        # Create a special conversation for tool refresh
        conversation_id = f"tool-refresh-{os.urandom(4).hex()}"
        
        # Connect to the agent WebSocket
        uri = f"{AGENT_WS_URL}/ws/{conversation_id}"
        logger.info(f"Connecting to agent WebSocket: {uri}")
        
        async with websockets.connect(uri) as websocket:
            # Send refresh command
            message = {
                "type": "system",
                "action": "refresh_tools",
                "conversation_id": conversation_id
            }
            await websocket.send(json.dumps(message))
            
            # Wait for response
            response = await websocket.recv()
            data = json.loads(response)
            
            if data.get("status") == "success":
                logger.info("✅ Tools refreshed successfully via WebSocket")
                if "tools" in data:
                    tool_count = len(data["tools"])
                    logger.info(f"   Found {tool_count} tools")
                return True
            else:
                logger.error(f"❌ Failed to refresh tools: {data}")
                return False
            
    except Exception as e:
        logger.error(f"❌ Error refreshing tools via WebSocket: {str(e)}")
        return False

def refresh_tools_http():
    """Refresh agent tools using HTTP API."""
    try:
        # Use the HTTP endpoint to refresh tools
        url = urljoin(AGENT_HTTP_URL, "/refresh-tools")
        logger.info(f"Sending refresh request to: {url}")
        
        response = requests.post(url, json={"force": True}, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            logger.info("✅ Tools refreshed successfully via HTTP")
            
            if "tools" in data and isinstance(data["tools"], list):
                tool_count = len(data["tools"])
                logger.info(f"   Found {tool_count} tools")
                for tool in data["tools"]:
                    logger.info(f"   - {tool}")
            return True
        else:
            logger.error(f"❌ Failed to refresh tools: {response.status_code} {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error refreshing tools via HTTP: {str(e)}")
        return False

def restart_agent_container():
    """Restart the agent container using Docker."""
    try:
        logger.info("Attempting to restart agent container...")
        
        # Use docker compose to restart just the agent service
        import subprocess
        result = subprocess.run(
            ["docker", "compose", "-f", "docker-compose-all.yml", "restart", "agent"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            logger.info("✅ Agent container restarted successfully")
            # Wait for container to start up
            logger.info("Waiting for agent to initialize...")
            import time
            time.sleep(5)
            return True
        else:
            logger.error(f"❌ Failed to restart agent container: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error restarting agent container: {str(e)}")
        return False

async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Force agent to refresh tool definitions")
    parser.add_argument("--http", action="store_true", help="Use HTTP endpoint instead of WebSocket")
    parser.add_argument("--restart", action="store_true", help="Restart agent container if refresh fails")
    args = parser.parse_args()
    
    logger.info("🔄 Refreshing agent tool definitions...")
    
    success = False
    
    if args.http:
        # Try HTTP refresh
        success = refresh_tools_http()
    else:
        # Try WebSocket refresh
        try:
            success = await refresh_tools_ws()
        except ImportError:
            logger.error("WebSockets library not installed. Install with 'pip install websockets'")
            logger.info("Falling back to HTTP refresh...")
            success = refresh_tools_http()
        except Exception as e:
            logger.error(f"Error with WebSocket refresh: {str(e)}")
            logger.info("Falling back to HTTP refresh...")
            success = refresh_tools_http()
    
    # If both methods fail and restart is requested
    if not success and args.restart:
        logger.info("Refresh failed, attempting to restart agent container...")
        restart_success = restart_agent_container()
        
        if restart_success:
            # Try refresh again after restart
            if args.http:
                success = refresh_tools_http()
            else:
                try:
                    success = await refresh_tools_ws()
                except:
                    success = refresh_tools_http()
    
    if success:
        logger.info("✅ Agent tools refresh completed successfully")
        return 0
    else:
        logger.error("❌ Failed to refresh agent tools")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)