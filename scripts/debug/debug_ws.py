#!/usr/bin/env python3
"""
WebSocket Connection Debugger for NXT HUMANS AI CX Workbench

This script helps diagnose WebSocket connection issues between the client and agent service.
It analyzes logs, checks network connectivity, and provides detailed diagnostics.
"""

import os
import sys
import json
import time
import subprocess
import argparse
import socket
from datetime import datetime
import logging
import asyncio
import uuid
import websockets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("websocket_debug.log")
    ]
)
logger = logging.getLogger("websocket-debug")

def print_header(title):
    """Print a formatted header"""
    border = "=" * (len(title) + 4)
    print(f"\n{border}")
    print(f"| {title} |")
    print(f"{border}\n")

def run_command(command, shell=True):
    """Run a shell command and return output"""
    try:
        result = subprocess.run(
            command,
            shell=shell,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Command timed out", 1
    except Exception as e:
        return "", str(e), 1

def check_environment_variables():
    """Check environment variables related to WebSocket connections"""
    print_header("Environment Variables")
    
    # Read .env file if exists
    env_vars = {}
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    env_vars[key] = value
    
    # Check essential environment variables
    essential_vars = [
        "ENABLE_CX_AGENT",
        "AGENT_WS_URL",
        "AGENT_CLIENT_WS_URL",
        "ANTHROPIC_API_KEY"
    ]
    
    for var in essential_vars:
        value = os.environ.get(var, env_vars.get(var, "Not set"))
        if var == "ANTHROPIC_API_KEY" and value != "Not set":
            # Mask API key
            value = value[:4] + "..." + value[-4:]
        
        if value == "Not set":
            print(f"❌ {var}: Not set (required)")
        else:
            print(f"✅ {var}: {value}")
    
    # Check additional relevant variables
    additional_vars = [
        "AGENT_DIRECT_IP",
        "AGENT_URL",
    ]
    
    for var in additional_vars:
        value = os.environ.get(var, env_vars.get(var, "Not set"))
        print(f"ℹ️ {var}: {value}")
    
    return env_vars

def check_container_status():
    """Check the status of Docker containers"""
    print_header("Docker Container Status")
    
    stdout, stderr, _ = run_command("docker ps --format '{{.Names}}'")
    
    if stderr:
        print(f"Error running docker ps: {stderr}")
        return False
    
    containers = stdout.strip().split("\n")
    essential_containers = ["agent", "launchpad"]
    
    for container in essential_containers:
        if any(c.endswith(container) for c in containers):
            print(f"✅ {container} container is running")
        else:
            print(f"❌ {container} container is NOT running")
            return False
    
    return True

def check_network_connectivity():
    """Check network connectivity between services"""
    print_header("Network Connectivity")
    
    # Get agent container IP
    stdout, stderr, _ = run_command("docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' agent")
    if stderr:
        print(f"Error getting agent IP: {stderr}")
        agent_ip = None
    else:
        agent_ip = stdout.strip()
        print(f"Agent container IP: {agent_ip}")
    
    # Check connectivity to agent container
    if agent_ip:
        # Check if port 8500 is open
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex((agent_ip, 8500))
            if result == 0:
                print(f"✅ Port 8500 is open on agent container ({agent_ip})")
            else:
                print(f"❌ Port 8500 is NOT open on agent container ({agent_ip})")
            sock.close()
        except Exception as e:
            print(f"❌ Error checking port 8500: {str(e)}")
    
    # Check if localhost:8500 is accessible
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex(("localhost", 8500))
        if result == 0:
            print("✅ Port 8500 is open on localhost")
        else:
            print("❌ Port 8500 is NOT open on localhost")
        sock.close()
    except Exception as e:
        print(f"❌ Error checking localhost:8500: {str(e)}")
    
    # Test HTTP connection to agent health endpoint
    stdout, stderr, code = run_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:8500/health")
    if code == 0 and stdout.strip() == "200":
        print("✅ Agent health endpoint is accessible via HTTP")
    else:
        print("❌ Agent health endpoint is NOT accessible via HTTP")
    
    return agent_ip

def check_logs():
    """Check logs for WebSocket-related issues"""
    print_header("Log Analysis")
    
    # Check launchpad logs
    stdout, stderr, _ = run_command("docker logs --tail 50 nxthumans_ai_cx_workbench-launchpad-1 2>&1 | grep -i websocket")
    if stdout:
        print("Launchpad WebSocket logs:")
        for line in stdout.strip().split("\n"):
            if "error" in line.lower() or "exception" in line.lower():
                print(f"❌ {line}")
            else:
                print(f"ℹ️ {line}")
    else:
        print("No WebSocket-related logs found in launchpad container")
    
    # Check agent logs
    stdout, stderr, _ = run_command("docker logs --tail 50 agent 2>&1 | grep -i websocket")
    if stdout:
        print("\nAgent WebSocket logs:")
        for line in stdout.strip().split("\n"):
            if "error" in line.lower() or "exception" in line.lower():
                print(f"❌ {line}")
            else:
                print(f"ℹ️ {line}")
    else:
        print("No WebSocket-related logs found in agent container")

async def test_connection(ws_url):
    """Test WebSocket connection"""
    print(f"Attempting to connect to: {ws_url}")
    try:
        async with websockets.connect(
            ws_url, 
            ping_interval=20, 
            ping_timeout=10,
            close_timeout=5,
            max_size=10485760
        ) as websocket:
            print(f"✅ Connected to {ws_url}")
            
            # Send a ping message
            ping_message = json.dumps({
                "type": "ping"
            })
            print(f"Sending ping: {ping_message}")
            await websocket.send(ping_message)
            
            # Wait for a pong response
            try:
                pong = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"Received response to ping: {pong}")
            except asyncio.TimeoutError:
                print("⚠️ No response to ping received after 5 seconds")
            
            # Send a test message
            test_message = json.dumps({
                "type": "message",
                "content": "Test message from debug script"
            })
            print(f"Sending message: {test_message}")
            await websocket.send(test_message)
            
            # Wait for a response with timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10)
                print(f"Received response: {response[:100]}...")
                return True
            except asyncio.TimeoutError:
                print("⚠️ No response received after 10 seconds")
                return False
                
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False

async def test_websocket_connections():
    """Test WebSocket connections with different URLs"""
    print_header("WebSocket Connection Tests")
    
    # Generate a test conversation ID
    conversation_id = str(uuid.uuid4())
    print(f"Using test conversation ID: {conversation_id}")
    
    # URLs to test in order of preference
    urls_to_test = [
        f"ws://localhost:8000/ws-proxy/{conversation_id}",  # Proxy connection
        f"ws://localhost:8500/ws/{conversation_id}",        # Direct connection via localhost
        f"ws://agent:8500/ws/{conversation_id}"             # Direct connection to container
    ]
    
    # Additional URLs from environment
    env_agent_ws_url = os.environ.get("AGENT_WS_URL")
    env_client_ws_url = os.environ.get("AGENT_CLIENT_WS_URL")
    
    if env_agent_ws_url:
        # Add configured agent URL
        urls_to_test.append(f"{env_agent_ws_url}/ws/{conversation_id}")
    
    if env_client_ws_url:
        # Add configured client URL
        urls_to_test.append(f"{env_client_ws_url}/ws/{conversation_id}")
    
    # Try to get agent IP
    stdout, stderr, _ = run_command("docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' agent")
    if not stderr and stdout.strip():
        agent_ip = stdout.strip()
        # Add direct IP URL
        urls_to_test.append(f"ws://{agent_ip}:8500/ws/{conversation_id}")
    
    # Test each URL
    results = {}
    for url in urls_to_test:
        print(f"\nTesting connection to: {url}")
        success = await test_connection(url)
        results[url] = success
        print(f"URL {url}: {'✅ Success' if success else '❌ Failed'}")
        print("-" * 50)
        
        # If we found a working connection, no need to test further
        if success:
            print(f"Found working WebSocket URL: {url}")
            break
    
    # Summary
    print("\nConnection Test Summary:")
    for url, success in results.items():
        print(f"{'✅' if success else '❌'} {url}")
    
    return results

def fix_suggestions(env_vars, agent_ip):
    """Provide suggestions to fix WebSocket issues"""
    print_header("Fix Suggestions")
    
    suggestions = []
    
    # Check if CX agent is enabled
    if env_vars.get("ENABLE_CX_AGENT", "").lower() != "true":
        suggestions.append("Set ENABLE_CX_AGENT=true in your .env file")
    
    # Check agent WebSocket URL
    if not env_vars.get("AGENT_WS_URL"):
        if agent_ip:
            suggestions.append(f"Set AGENT_WS_URL=ws://{agent_ip}:8500 in your .env file")
        else:
            suggestions.append("Set AGENT_WS_URL=ws://agent:8500 in your .env file")
    
    # Check client WebSocket URL
    if not env_vars.get("AGENT_CLIENT_WS_URL"):
        suggestions.append("Set AGENT_CLIENT_WS_URL=ws://localhost:8500 in your .env file")
    
    # Add direct IP if available
    if agent_ip and env_vars.get("AGENT_DIRECT_IP") != agent_ip:
        suggestions.append(f"Set AGENT_DIRECT_IP={agent_ip} in your .env file")
    
    # General suggestions
    suggestions.extend([
        "Run ./fix-websocket-connection.sh to apply all WebSocket fixes",
        "Try using the client-side fallback by running useDirectConnection() in the browser console",
        "Restart all containers with docker-compose down && docker-compose -f docker-compose-all.yml up -d",
        "Check that the ANTHROPIC_API_KEY is valid and properly set"
    ])
    
    if suggestions:
        for i, suggestion in enumerate(suggestions, 1):
            print(f"{i}. {suggestion}")
    else:
        print("No specific issues found. The WebSocket connection should be working.")
    
    return suggestions

async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="WebSocket Connection Debugger")
    parser.add_argument("--check-logs", action="store_true", help="Check logs only")
    parser.add_argument("--test-connection", action="store_true", help="Test WebSocket connections only")
    args = parser.parse_args()
    
    print_header("WebSocket Connection Debugger")
    print(f"Running diagnostics at {datetime.now().isoformat()}")
    
    if args.check_logs:
        check_logs()
        return
    
    if args.test_connection:
        await test_websocket_connections()
        return
    
    env_vars = check_environment_variables()
    
    container_status = check_container_status()
    if not container_status:
        print("\nRequired containers are not running. Please start them first.")
        return
    
    agent_ip = check_network_connectivity()
    
    check_logs()
    
    await test_websocket_connections()
    
    fix_suggestions(env_vars, agent_ip)
    
    print("\nDiagnostics complete. See above for issues and suggestions.")

if __name__ == "__main__":
    asyncio.run(main())