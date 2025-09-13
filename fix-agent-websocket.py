#!/usr/bin/env python3
"""
Fix Agent WebSocket Connection
-----------------------------
This script diagnoses and fixes WebSocket connection issues between the agent and launchpad.
It verifies the API key and tests connectivity between components.
"""

import os
import sys
import logging
import subprocess
import json
import argparse
import requests
import time
import re
from urllib.parse import urlparse, urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("fix-agent-websocket")

# Configuration
AGENT_HTTP_URL = os.environ.get("AGENT_HTTP_URL", "http://localhost:8500")
AGENT_CONTAINER_NAME = os.environ.get("AGENT_CONTAINER_NAME", "agent")
LAUNCHPAD_CONTAINER_NAME = os.environ.get("LAUNCHPAD_CONTAINER_NAME", "nxthumans_ai_cx_workbench-launchpad-1")
DOCKER_COMPOSE_FILE = os.environ.get("DOCKER_COMPOSE_FILE", "docker-compose-all.yml")

def run_command(cmd, description=None):
    """Run a shell command and return the output"""
    if description:
        logger.info(f"Running: {description}")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            logger.error(f"Command failed: {result.stderr}")
            return None
    except Exception as e:
        logger.error(f"Error running command: {str(e)}")
        return None

def check_container_status(container_name):
    """Check if a container is running"""
    cmd = f"docker inspect --format='{{{{.State.Status}}}}' {container_name} 2>/dev/null || echo 'not_found'"
    status = run_command(cmd)
    
    if status == "running":
        logger.info(f"Container {container_name} is running")
        return True
    elif status == "not_found":
        logger.error(f"Container {container_name} not found")
    else:
        logger.error(f"Container {container_name} is {status}")
    
    return False

def check_agent_config():
    """Check agent configuration"""
    # Check API key
    api_key_cmd = f"docker exec {AGENT_CONTAINER_NAME} printenv ANTHROPIC_API_KEY"
    api_key = run_command(api_key_cmd, "Checking Anthropic API key")
    
    if not api_key:
        logger.error("Anthropic API key not found or empty")
        return False
    
    logger.info(f"Anthropic API key: {api_key[:5]}...{api_key[-5:]}")
    
    # Check model name
    model_cmd = f"docker exec {AGENT_CONTAINER_NAME} printenv ANTHROPIC_MODEL"
    model = run_command(model_cmd, "Checking Anthropic model")
    
    if not model:
        logger.error("Anthropic model not found or empty")
        return False
    
    logger.info(f"Anthropic model: {model}")
    
    return True

def check_agent_connectivity():
    """Check if the agent service is accessible"""
    try:
        # Check agent HTTP endpoint
        agent_response = requests.get(f"{AGENT_HTTP_URL}/health", timeout=5)
        logger.info(f"Agent HTTP endpoint: {AGENT_HTTP_URL}/health - Status: {agent_response.status_code}")
        
        # Get agent info
        if agent_response.status_code == 200:
            agent_info_response = requests.get(AGENT_HTTP_URL, timeout=5)
            if agent_info_response.status_code == 200:
                agent_info = agent_info_response.json()
                logger.info(f"Agent service: {agent_info.get('service')}")
                logger.info(f"Agent status: {agent_info.get('status')}")
                logger.info(f"Agent model: {agent_info.get('model')}")
                return True
        
        return False
    except Exception as e:
        logger.error(f"Error checking agent connectivity: {str(e)}")
        return False

def check_container_network():
    """Check network connectivity between containers"""
    # Get agent container IP
    agent_ip_cmd = f"docker inspect -f '{{{{range .NetworkSettings.Networks}}}}{{{{.IPAddress}}}}{{{{end}}}}' {AGENT_CONTAINER_NAME}"
    agent_ip = run_command(agent_ip_cmd, "Getting agent container IP")
    
    if not agent_ip:
        logger.error("Could not determine agent container IP")
        return False
    
    logger.info(f"Agent container IP: {agent_ip}")
    
    # Get launchpad container IP
    launchpad_ip_cmd = f"docker inspect -f '{{{{range .NetworkSettings.Networks}}}}{{{{.IPAddress}}}}{{{{end}}}}' {LAUNCHPAD_CONTAINER_NAME}"
    launchpad_ip = run_command(launchpad_ip_cmd, "Getting launchpad container IP")
    
    if not launchpad_ip:
        logger.error("Could not determine launchpad container IP")
        return False
    
    logger.info(f"Launchpad container IP: {launchpad_ip}")
    
    # Check connectivity from launchpad to agent
    ping_cmd = f"docker exec {LAUNCHPAD_CONTAINER_NAME} curl -s http://{agent_ip}:8500/health"
    ping_result = run_command(ping_cmd, "Testing connectivity from launchpad to agent")
    
    if ping_result and "healthy" in ping_result.lower():
        logger.info("Launchpad can connect to agent")
        return True
    else:
        logger.error("Launchpad cannot connect to agent")
        return False

def fix_launchpad_config():
    """Fix the launchpad configuration to use agent container IP"""
    # Get agent container IP
    agent_ip_cmd = f"docker inspect -f '{{{{range .NetworkSettings.Networks}}}}{{{{.IPAddress}}}}{{{{end}}}}' {AGENT_CONTAINER_NAME}"
    agent_ip = run_command(agent_ip_cmd)
    
    if not agent_ip:
        logger.error("Could not determine agent container IP")
        return False
    
    # Backup the current launchpad app.py
    backup_cmd = f"docker exec {LAUNCHPAD_CONTAINER_NAME} cp /app/app.py /app/app.py.backup"
    run_command(backup_cmd, "Backing up launchpad app.py")
    
    # Update the agent WebSocket URL in launchpad
    update_cmd = f"""docker exec {LAUNCHPAD_CONTAINER_NAME} sed -i 's|AGENT_WS_URL = os.environ.get("AGENT_WS_URL", "ws://agent:8500")|AGENT_WS_URL = os.environ.get("AGENT_WS_URL", "ws://{agent_ip}:8500")|g' /app/app.py"""
    run_command(update_cmd, "Updating agent WebSocket URL in launchpad")
    
    # Update the agent connectivity check
    check_update_cmd = f"""docker exec {LAUNCHPAD_CONTAINER_NAME} sed -i 's|url = f"http://agent:8500/health"|url = f"http://{agent_ip}:8500/health"|g' /app/app.py"""
    run_command(check_update_cmd, "Updating agent connectivity check in launchpad")
    
    # Find and fix WebSocket proxy code to use direct IP
    fix_ws_proxy_cmd = f"""docker exec {LAUNCHPAD_CONTAINER_NAME} sed -i 's|ws://agent:8500|ws://{agent_ip}:8500|g' /app/app.py"""
    run_command(fix_ws_proxy_cmd, "Fixing WebSocket proxy code in launchpad")
    
    # Restart the launchpad service
    restart_cmd = f"docker restart {LAUNCHPAD_CONTAINER_NAME}"
    run_command(restart_cmd, "Restarting launchpad service")
    
    # Wait for the service to start
    logger.info("Waiting for launchpad service to restart...")
    time.sleep(5)
    
    return True

def fix_agent_websocket():
    """Apply the fix for agent WebSocket connection"""
    # Get agent container IP
    agent_ip_cmd = f"docker inspect -f '{{{{range .NetworkSettings.Networks}}}}{{{{.IPAddress}}}}{{{{end}}}}' {AGENT_CONTAINER_NAME}"
    agent_ip = run_command(agent_ip_cmd)
    
    if not agent_ip:
        logger.error("Could not determine agent container IP")
        return False
    
    # Update docker-compose environment variable for agent
    env_file = ".env"
    
    # Check if .env file exists
    if os.path.exists(env_file):
        # Read the existing content
        with open(env_file, "r") as f:
            content = f.read()
        
        # Update or add AGENT_WS_URL
        if "AGENT_WS_URL=" in content:
            content = re.sub(r"AGENT_WS_URL=.*", f"AGENT_WS_URL=ws://{agent_ip}:8500", content)
        else:
            content += f"\nAGENT_WS_URL=ws://{agent_ip}:8500\n"
        
        # Write the updated content
        with open(env_file, "w") as f:
            f.write(content)
        
        logger.info(f"Updated AGENT_WS_URL in {env_file}")
    else:
        # Create a new .env file
        with open(env_file, "w") as f:
            f.write(f"AGENT_WS_URL=ws://{agent_ip}:8500\n")
        
        logger.info(f"Created {env_file} with AGENT_WS_URL")
    
    # Create or update the direct connection URL for browser client
    client_fix_file = "fix-ws-client.js"
    
    if os.path.exists(client_fix_file):
        # Read existing file
        with open(client_fix_file, "r") as f:
            client_content = f.read()
        
        # Update direct URL
        client_content = re.sub(
            r"const directUrl = `ws://localhost:8500/ws/\${conversationId}`",
            f"const directUrl = `ws://{agent_ip}:8500/ws/${{conversationId}}`",
            client_content
        )
        
        # Write updated content
        with open(client_fix_file, "w") as f:
            f.write(client_content)
        
        logger.info(f"Updated direct URL in {client_fix_file}")
    
    return True

def test_connectivity():
    """Test connectivity after applying fixes"""
    logger.info("Testing connectivity after fixes...")
    
    # Check if agent is accessible
    try:
        agent_response = requests.get(f"{AGENT_HTTP_URL}/health", timeout=5)
        if agent_response.status_code == 200:
            logger.info("Agent HTTP endpoint is accessible")
        else:
            logger.error(f"Agent HTTP endpoint returned status {agent_response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error connecting to agent HTTP endpoint: {str(e)}")
        return False
    
    # Create a test conversation
    try:
        response = requests.post(f"{AGENT_HTTP_URL}/api/chat/conversation", timeout=5)
        if response.status_code == 200:
            conversation_id = response.json().get("conversation_id")
            logger.info(f"Created test conversation: {conversation_id}")
            
            # Send a test message
            message_response = requests.post(
                f"{AGENT_HTTP_URL}/api/chat/message",
                data={
                    "conversation_id": conversation_id,
                    "message": "Test message"
                },
                timeout=10
            )
            
            if message_response.status_code == 200:
                logger.info("Successfully sent test message")
                return True
            else:
                logger.error(f"Error sending test message: {message_response.status_code}")
                return False
        else:
            logger.error(f"Error creating test conversation: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error testing connectivity: {str(e)}")
        return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Fix agent WebSocket connection issues")
    parser.add_argument("--check-only", action="store_true", help="Only check for issues without fixing")
    parser.add_argument("--force", action="store_true", help="Force apply fixes even if no issues detected")
    args = parser.parse_args()
    
    logger.info("=" * 50)
    logger.info("AGENT WEBSOCKET CONNECTION FIXER")
    logger.info("=" * 50)
    
    # Check container status
    logger.info("\nChecking container status...")
    agent_running = check_container_status(AGENT_CONTAINER_NAME)
    launchpad_running = check_container_status(LAUNCHPAD_CONTAINER_NAME)
    
    if not agent_running or not launchpad_running:
        logger.error("Cannot proceed - containers must be running")
        return 1
    
    # Check agent configuration
    logger.info("\nChecking agent configuration...")
    agent_config_ok = check_agent_config()
    
    if not agent_config_ok:
        logger.error("Agent configuration is invalid")
        return 1
    
    # Check agent connectivity
    logger.info("\nChecking agent connectivity...")
    agent_connectivity_ok = check_agent_connectivity()
    
    # Check container network
    logger.info("\nChecking container network...")
    container_network_ok = check_container_network()
    
    # Determine if fixes are needed
    fixes_needed = (
        not agent_connectivity_ok or
        not container_network_ok or
        args.force
    )
    
    if fixes_needed:
        logger.info("\nIssues detected that require fixing")
        
        if args.check_only:
            logger.info("Check-only mode enabled - not applying fixes")
            return 1
        
        # Apply fixes
        logger.info("\nApplying fixes...")
        
        # Fix launchpad configuration
        logger.info("\n1. Fixing launchpad configuration...")
        launchpad_fixed = fix_launchpad_config()
        
        if not launchpad_fixed:
            logger.error("Failed to fix launchpad configuration")
            return 1
        
        # Fix agent WebSocket
        logger.info("\n2. Fixing agent WebSocket configuration...")
        agent_fixed = fix_agent_websocket()
        
        if not agent_fixed:
            logger.error("Failed to fix agent WebSocket configuration")
            return 1
        
        # Test connectivity
        logger.info("\n3. Testing connectivity after fixes...")
        connectivity_ok = test_connectivity()
        
        if connectivity_ok:
            logger.info("\n✅ Fixes applied successfully!")
            logger.info("\nIf you still experience issues, try restarting all services:")
            logger.info(f"docker compose -f {DOCKER_COMPOSE_FILE} restart")
            return 0
        else:
            logger.error("\n❌ Fixes did not resolve the issues")
            return 1
    else:
        logger.info("\n✅ No issues detected with agent WebSocket connection")
        return 0

if __name__ == "__main__":
    sys.exit(main())