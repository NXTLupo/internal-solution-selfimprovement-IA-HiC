#!/usr/bin/env python3
"""
Claude Doctor - Comprehensive AI Agent Diagnostic Tool
-----------------------------------------------------
This tool performs a complete diagnostic on the agent communication chain
and WebSocket infrastructure to identify and fix issues.
"""
import os
import subprocess
import json
import logging
import time
import requests
import re
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("claude-doctor")

# Configuration
AGENT_CONTAINER = "agent"
LAUNCHPAD_CONTAINER = "nxthumans_ai_cx_workbench-launchpad-1"
AGENT_PORT = 8500
LAUNCHPAD_PORT = 8000

class ClaudeDoctor:
    def __init__(self):
        self.issues = []
        self.fixes = []
        self.diagnostics = {}
        
    def run_command(self, cmd, description=None):
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
    
    def check_container_status(self):
        """Check if required containers are running"""
        logger.info("Checking container status...")
        
        # Check agent container
        agent_cmd = f"docker ps --filter name={AGENT_CONTAINER} --format '{{{{.Status}}}}'"
        agent_status = self.run_command(agent_cmd)
        
        # Check launchpad container
        launchpad_cmd = f"docker ps --filter name={LAUNCHPAD_CONTAINER} --format '{{{{.Status}}}}'"
        launchpad_status = self.run_command(launchpad_cmd)
        
        self.diagnostics["containers"] = {
            "agent": {
                "status": agent_status if agent_status else "not running",
                "healthy": bool(agent_status and "Up" in agent_status)
            },
            "launchpad": {
                "status": launchpad_status if launchpad_status else "not running",
                "healthy": bool(launchpad_status and "Up" in launchpad_status)
            }
        }
        
        if not agent_status or "Up" not in agent_status:
            self.issues.append("Agent container is not running")
        
        if not launchpad_status or "Up" not in launchpad_status:
            self.issues.append("Launchpad container is not running")
        
        return self.diagnostics["containers"]["agent"]["healthy"] and self.diagnostics["containers"]["launchpad"]["healthy"]
    
    def check_api_keys(self):
        """Check if required API keys are set"""
        logger.info("Checking API keys...")
        
        # Check Anthropic API key in agent container
        if self.diagnostics["containers"]["agent"]["healthy"]:
            api_key_cmd = f"docker exec {AGENT_CONTAINER} printenv ANTHROPIC_API_KEY"
            api_key = self.run_command(api_key_cmd)
            
            if not api_key:
                self.issues.append("Anthropic API key not set in agent container")
                self.diagnostics["api_keys"] = {"anthropic": {"present": False}}
            else:
                # Mask the key
                masked_key = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "[INVALID]"
                self.diagnostics["api_keys"] = {
                    "anthropic": {
                        "present": True,
                        "masked_key": masked_key,
                        "length": len(api_key)
                    }
                }
                
                if len(api_key) < 20:  # Simple check for key validity
                    self.issues.append("Anthropic API key appears to be invalid (too short)")
        
        return "api_keys" in self.diagnostics and self.diagnostics["api_keys"]["anthropic"]["present"]
    
    def check_network_connectivity(self):
        """Check network connectivity between containers"""
        logger.info("Checking network connectivity...")
        
        if not (self.diagnostics["containers"]["agent"]["healthy"] and 
                self.diagnostics["containers"]["launchpad"]["healthy"]):
            logger.error("Cannot check network connectivity - containers not running")
            return False
        
        # Get container IPs
        agent_ip_cmd = f"docker inspect -f '{{{{range .NetworkSettings.Networks}}}}{{{{.IPAddress}}}}{{{{end}}}}' {AGENT_CONTAINER}"
        agent_ip = self.run_command(agent_ip_cmd)
        
        launchpad_ip_cmd = f"docker inspect -f '{{{{range .NetworkSettings.Networks}}}}{{{{.IPAddress}}}}{{{{end}}}}' {LAUNCHPAD_CONTAINER}"
        launchpad_ip = self.run_command(launchpad_ip_cmd)
        
        self.diagnostics["network"] = {
            "agent_ip": agent_ip,
            "launchpad_ip": launchpad_ip
        }
        
        # Check connectivity from launchpad to agent
        if agent_ip and launchpad_ip:
            ping_cmd = f"docker exec {LAUNCHPAD_CONTAINER} curl -s http://{agent_ip}:{AGENT_PORT}/health"
            ping_result = self.run_command(ping_cmd)
            
            self.diagnostics["network"]["connectivity"] = {
                "launchpad_to_agent": bool(ping_result and "healthy" in ping_result.lower())
            }
            
            if not (ping_result and "healthy" in ping_result.lower()):
                self.issues.append("Launchpad cannot connect to agent")
        else:
            self.issues.append("Could not determine container IP addresses")
            return False
        
        return "connectivity" in self.diagnostics["network"] and self.diagnostics["network"]["connectivity"]["launchpad_to_agent"]
    
    def check_websocket_config(self):
        """Check WebSocket configuration in launchpad and agent"""
        logger.info("Checking WebSocket configuration...")
        
        # Check agent WebSocket endpoint
        agent_ws_check = f"docker exec {AGENT_CONTAINER} grep -A 10 '@app.websocket' /app/app.py"
        agent_ws_code = self.run_command(agent_ws_check)
        
        # Check launchpad WebSocket proxy
        launchpad_ws_check = f"docker exec {LAUNCHPAD_CONTAINER} grep -A 10 'ws-proxy' /app/app.py"
        launchpad_ws_code = self.run_command(launchpad_ws_check)
        
        # Check WebSocket URL configuration in launchpad
        agent_ws_url_check = f"docker exec {LAUNCHPAD_CONTAINER} grep 'AGENT_WS_URL' /app/app.py"
        agent_ws_url = self.run_command(agent_ws_url_check)
        
        # Check for welcome message in agent
        welcome_check = f"docker exec {AGENT_CONTAINER} grep -A 5 'Send initial welcome message' /app/app.py"
        welcome_code = self.run_command(welcome_check)
        
        self.diagnostics["websocket"] = {
            "agent_endpoint": bool(agent_ws_code),
            "launchpad_proxy": bool(launchpad_ws_code),
            "agent_ws_url": agent_ws_url,
            "welcome_message": bool(welcome_code)
        }
        
        if not agent_ws_code:
            self.issues.append("Agent WebSocket endpoint not found")
        
        if not launchpad_ws_code:
            self.issues.append("Launchpad WebSocket proxy not found")
        
        if not welcome_code:
            self.issues.append("Agent welcome message implementation not found")
        
        # Check if direct IP is used in WebSocket URL
        if agent_ws_url and "agent:" in agent_ws_url and self.diagnostics["network"]["agent_ip"]:
            self.issues.append("Agent WebSocket URL uses container name instead of IP address")
            self.fixes.append({
                "type": "agent_ws_url",
                "current": agent_ws_url,
                "proposed": agent_ws_url.replace("agent:", f"{self.diagnostics['network']['agent_ip']}:")
            })
        
        return all([
            self.diagnostics["websocket"]["agent_endpoint"],
            self.diagnostics["websocket"]["launchpad_proxy"],
            self.diagnostics["websocket"]["welcome_message"]
        ])
    
    def check_chatbot_client(self):
        """Check chatbot client implementation"""
        logger.info("Checking chatbot client implementation...")
        
        # Check for duplicate welcome message
        duplicate_welcome_check = f"docker exec {LAUNCHPAD_CONTAINER} grep -A 3 'No static welcome message' /app/static/chatbot.js"
        no_static_welcome = self.run_command(duplicate_welcome_check)
        
        # Check for initialMessageReceived flag
        message_tracking_check = f"docker exec {LAUNCHPAD_CONTAINER} grep -A 3 'initialMessageReceived' /app/static/chatbot.js"
        message_tracking = self.run_command(message_tracking_check)
        
        self.diagnostics["client"] = {
            "no_static_welcome": bool(no_static_welcome),
            "message_tracking": bool(message_tracking)
        }
        
        if not no_static_welcome:
            self.issues.append("Chatbot client has duplicate welcome message")
        
        if not message_tracking:
            self.issues.append("Chatbot client lacks message tracking")
        
        return self.diagnostics["client"]["no_static_welcome"] and self.diagnostics["client"]["message_tracking"]
    
    def check_agent_api(self):
        """Check if agent API is responsive"""
        logger.info("Checking agent API...")
        
        try:
            response = requests.get(f"http://localhost:{AGENT_PORT}/health", timeout=5)
            
            self.diagnostics["agent_api"] = {
                "status_code": response.status_code,
                "response": response.text if response.status_code == 200 else None
            }
            
            if response.status_code != 200:
                self.issues.append(f"Agent API returned status code {response.status_code}")
                return False
            
            # Check if agent can create a conversation
            try:
                conv_response = requests.post(f"http://localhost:{AGENT_PORT}/api/chat/conversation", timeout=5)
                
                if conv_response.status_code == 200:
                    conversation_id = conv_response.json().get("conversation_id")
                    self.diagnostics["agent_api"]["conversation_creation"] = {
                        "success": True,
                        "conversation_id": conversation_id
                    }
                else:
                    self.diagnostics["agent_api"]["conversation_creation"] = {
                        "success": False,
                        "status_code": conv_response.status_code
                    }
                    self.issues.append("Agent failed to create conversation")
                    return False
            except Exception as e:
                self.diagnostics["agent_api"]["conversation_creation"] = {
                    "success": False,
                    "error": str(e)
                }
                self.issues.append(f"Error creating conversation: {str(e)}")
                return False
            
            return True
        except requests.RequestException as e:
            self.diagnostics["agent_api"] = {
                "error": str(e)
            }
            self.issues.append(f"Cannot connect to agent API: {str(e)}")
            return False
    
    def check_agent_logs(self):
        """Check agent logs for errors"""
        logger.info("Checking agent logs...")
        
        # Get recent logs
        logs_cmd = f"docker logs {AGENT_CONTAINER} --tail 100"
        logs = self.run_command(logs_cmd)
        
        if not logs:
            self.issues.append("Could not retrieve agent logs")
            return False
        
        # Look for errors in logs
        error_patterns = [
            "Error in WebSocket connection",
            "Failed to process message",
            "anthropic.errors",
            "WebSocket client disconnected",
            "WebSocket connection closed"
        ]
        
        errors_found = []
        for pattern in error_patterns:
            if pattern in logs:
                errors_found.append(pattern)
        
        self.diagnostics["agent_logs"] = {
            "errors_found": errors_found,
            "error_count": len(errors_found)
        }
        
        if errors_found:
            self.issues.append(f"Found {len(errors_found)} types of errors in agent logs")
        
        return len(errors_found) == 0
    
    def apply_fixes(self):
        """Apply fixes for identified issues"""
        logger.info("Applying fixes...")
        
        fixes_applied = []
        
        for fix in self.fixes:
            if fix["type"] == "agent_ws_url":
                # Fix WebSocket URL in launchpad
                logger.info(f"Fixing agent WebSocket URL: {fix['current']} -> {fix['proposed']}")
                
                fix_cmd = f"docker exec {LAUNCHPAD_CONTAINER} sed -i 's|{fix['current']}|{fix['proposed']}|g' /app/app.py"
                result = self.run_command(fix_cmd)
                
                if result is not None:  # Command executed without error
                    fixes_applied.append("Fixed agent WebSocket URL")
                    
                    # Restart launchpad container
                    restart_cmd = f"docker restart {LAUNCHPAD_CONTAINER}"
                    self.run_command(restart_cmd, "Restarting launchpad container")
                    time.sleep(5)  # Wait for restart
        
        return fixes_applied
    
    def run_diagnostics(self):
        """Run all diagnostics"""
        logger.info("Running diagnostics...")
        
        # Check container status
        container_status_ok = self.check_container_status()
        if not container_status_ok:
            logger.error("Container status check failed")
            return False
        
        # Check API keys
        api_keys_ok = self.check_api_keys()
        if not api_keys_ok:
            logger.error("API key check failed")
            return False
        
        # Check network connectivity
        network_ok = self.check_network_connectivity()
        if not network_ok:
            logger.error("Network connectivity check failed")
        
        # Check WebSocket configuration
        websocket_ok = self.check_websocket_config()
        if not websocket_ok:
            logger.error("WebSocket configuration check failed")
        
        # Check chatbot client
        client_ok = self.check_chatbot_client()
        if not client_ok:
            logger.error("Chatbot client check failed")
        
        # Check agent API
        api_ok = self.check_agent_api()
        if not api_ok:
            logger.error("Agent API check failed")
        
        # Check agent logs
        logs_ok = self.check_agent_logs()
        if not logs_ok:
            logger.error("Agent logs check failed")
        
        return True
    
    def fix_issues(self):
        """Fix identified issues"""
        if not self.issues:
            logger.info("No issues to fix")
            return []
        
        return self.apply_fixes()
    
    def generate_report(self):
        """Generate diagnostic report"""
        status_emoji = {
            True: "✅",
            False: "❌"
        }
        
        # Calculate overall health percentage
        checks_total = 7  # container, api keys, network, websocket, client, api, logs
        checks_passed = sum([
            all(container["healthy"] for container in self.diagnostics.get("containers", {}).values()),
            self.diagnostics.get("api_keys", {}).get("anthropic", {}).get("present", False),
            self.diagnostics.get("network", {}).get("connectivity", {}).get("launchpad_to_agent", False),
            all([
                self.diagnostics.get("websocket", {}).get("agent_endpoint", False),
                self.diagnostics.get("websocket", {}).get("launchpad_proxy", False),
                self.diagnostics.get("websocket", {}).get("welcome_message", False)
            ]),
            all([
                self.diagnostics.get("client", {}).get("no_static_welcome", False),
                self.diagnostics.get("client", {}).get("message_tracking", False)
            ]),
            self.diagnostics.get("agent_api", {}).get("conversation_creation", {}).get("success", False),
            self.diagnostics.get("agent_logs", {}).get("error_count", 1) == 0
        ])
        
        health_percentage = int(100 * checks_passed / checks_total)
        
        report = f"""
=================================================
        CLAUDE DOCTOR DIAGNOSTIC REPORT
=================================================

Overall System Health: {health_percentage}%

1. Container Status:
   - Agent: {status_emoji[self.diagnostics.get("containers", {}).get("agent", {}).get("healthy", False)]} {self.diagnostics.get("containers", {}).get("agent", {}).get("status", "Unknown")}
   - Launchpad: {status_emoji[self.diagnostics.get("containers", {}).get("launchpad", {}).get("healthy", False)]} {self.diagnostics.get("containers", {}).get("launchpad", {}).get("status", "Unknown")}

2. API Keys:
   - Anthropic: {status_emoji[self.diagnostics.get("api_keys", {}).get("anthropic", {}).get("present", False)]} {self.diagnostics.get("api_keys", {}).get("anthropic", {}).get("masked_key", "Not set")}

3. Network:
   - Agent IP: {self.diagnostics.get("network", {}).get("agent_ip", "Unknown")}
   - Launchpad IP: {self.diagnostics.get("network", {}).get("launchpad_ip", "Unknown")}
   - Launchpad → Agent: {status_emoji[self.diagnostics.get("network", {}).get("connectivity", {}).get("launchpad_to_agent", False)]}

4. WebSocket Configuration:
   - Agent Endpoint: {status_emoji[self.diagnostics.get("websocket", {}).get("agent_endpoint", False)]}
   - Launchpad Proxy: {status_emoji[self.diagnostics.get("websocket", {}).get("launchpad_proxy", False)]}
   - Welcome Message: {status_emoji[self.diagnostics.get("websocket", {}).get("welcome_message", False)]}
   - WebSocket URL: {self.diagnostics.get("websocket", {}).get("agent_ws_url", "Not found")}

5. Chatbot Client:
   - No Static Welcome: {status_emoji[self.diagnostics.get("client", {}).get("no_static_welcome", False)]}
   - Message Tracking: {status_emoji[self.diagnostics.get("client", {}).get("message_tracking", False)]}

6. Agent API:
   - Status Code: {self.diagnostics.get("agent_api", {}).get("status_code", "N/A")}
   - Conversation Creation: {status_emoji[self.diagnostics.get("agent_api", {}).get("conversation_creation", {}).get("success", False)]}

7. Agent Logs:
   - Errors Found: {self.diagnostics.get("agent_logs", {}).get("error_count", "N/A")}

ISSUES FOUND ({len(self.issues)}):
{chr(10).join([f"- {issue}" for issue in self.issues]) if self.issues else "No issues found"}

FIXES APPLIED:
{chr(10).join([f"- {fix}" for fix in self.fix_issues()]) if self.fixes else "No fixes needed or applied"}

RECOMMENDATIONS:
"""
        
        # Add recommendations based on diagnostics
        recommendations = []
        
        if not self.diagnostics.get("containers", {}).get("agent", {}).get("healthy", False):
            recommendations.append("- Restart the agent container: docker restart agent")
            
        if not self.diagnostics.get("containers", {}).get("launchpad", {}).get("healthy", False):
            recommendations.append("- Restart the launchpad container: docker restart nxthumans_ai_cx_workbench-launchpad-1")
            
        if not self.diagnostics.get("api_keys", {}).get("anthropic", {}).get("present", False):
            recommendations.append("- Set the Anthropic API key: docker exec -it agent bash -c \"export ANTHROPIC_API_KEY=your-key-here\"")
            
        if not self.diagnostics.get("network", {}).get("connectivity", {}).get("launchpad_to_agent", False):
            recommendations.append("- Check Docker network settings and ensure containers are on the same network")
            
        if not self.diagnostics.get("websocket", {}).get("welcome_message", False):
            recommendations.append("- Add welcome message to agent WebSocket implementation")
            
        if not self.diagnostics.get("client", {}).get("no_static_welcome", False) or not self.diagnostics.get("client", {}).get("message_tracking", False):
            recommendations.append("- Fix chatbot client to prevent duplicate welcome messages: python fix_chatbot_client.py")
            
        if self.diagnostics.get("agent_logs", {}).get("error_count", 0) > 0:
            recommendations.append("- Check agent logs for detailed error information: docker logs agent")
            
        if not recommendations:
            recommendations.append("No specific recommendations - system appears to be functioning properly")
            
        report += "\n".join(recommendations)
        
        return report


def main():
    logger.info("Starting Claude Doctor")
    
    doctor = ClaudeDoctor()
    if doctor.run_diagnostics():
        report = doctor.generate_report()
        print(report)
        
        # Save report to file
        report_path = "claude_doctor_report.txt"
        with open(report_path, "w") as f:
            f.write(report)
        logger.info(f"Report saved to {report_path}")
    else:
        logger.error("Diagnostics failed")
    
    logger.info("Claude Doctor completed")

if __name__ == "__main__":
    main()