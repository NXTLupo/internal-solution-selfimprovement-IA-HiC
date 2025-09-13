#!/usr/bin/env python3
"""
MCP Tools Test Script
---------------------
This script tests the MCP tool interfaces across all services to ensure they're properly discoverable
and integrated with the agent.
"""

import os
import sys
import json
import logging
import requests
import argparse
import asyncio
import websockets
from typing import Dict, List, Any, Optional, Set
from urllib.parse import urljoin
from tabulate import tabulate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("mcp-tools-test")

# Service configurations
SERVICE_CONFIGS = {
    "reddit-mcp": {
        "url": os.environ.get("REDDIT_MCP_URL", "http://localhost:8501"),
        "expected_tools": ["reddit.search", "reddit.get_status", "reddit.get_results"]
    },
    "social-mcp": {
        "url": os.environ.get("SOCIAL_MCP_URL", "http://localhost:8502"),
        "expected_tools": ["social.topic_model", "social.get_topic_status", "social.get_topic_results", 
                          "social.sentiment_analysis", "social.get_sentiment_results", "social.search"]
    },
    "journey-mcp": {
        "url": os.environ.get("JOURNEY_MCP_URL", "http://localhost:8503"),
        "expected_tools": ["journey.upload_file", "journey.generate_map", "journey.get_status", "journey.get_results"]
    },
    "openai-journey-mcp": {
        "url": os.environ.get("OPENAI_JOURNEY_MCP_URL", "http://localhost:8505"),
        "expected_tools": ["openai_journey.upload_file", "openai_journey.generate_map", 
                          "openai_journey.get_results", "openai_journey.list_maps"]
    },
    "claude4-journey-mcp": {
        "url": os.environ.get("CLAUDE4_JOURNEY_MCP_URL", "http://localhost:8506"),
        "expected_tools": ["claude4_journey.upload_file", "claude4_journey.generate_map", 
                          "claude4_journey.get_status", "claude4_journey.get_results", "claude4_journey.list_maps"]
    },
    "video-mcp": {
        "url": os.environ.get("VIDEO_MCP_URL", "http://localhost:8504"),
        "expected_tools": ["video.transcribe", "video.get_status", "video.get_results"]
    }
}

# Agent WebSocket URL
AGENT_WS_URL = os.environ.get("AGENT_WS_URL", "ws://localhost:8500")

class MCPToolsTester:
    def __init__(self, services=None, verbose=False):
        """
        Initialize the MCP Tools Tester.
        
        Args:
            services: List of service names to test (None for all)
            verbose: Enable verbose output
        """
        self.services = services or list(SERVICE_CONFIGS.keys())
        self.verbose = verbose
        self.results = {}
        self.agent_tools = set()
        
    async def test_service(self, service_name: str) -> Dict[str, Any]:
        """
        Test a single MCP service.
        
        Args:
            service_name: Name of the service to test
        
        Returns:
            Test results for the service
        """
        if service_name not in SERVICE_CONFIGS:
            return {
                "status": "error",
                "message": f"Unknown service: {service_name}",
                "tools": []
            }
            
        config = SERVICE_CONFIGS[service_name]
        base_url = config["url"]
        expected_tools = set(config["expected_tools"])
        
        try:
            # Check service health
            try:
                health_url = urljoin(base_url, "/health")
                health_response = requests.get(health_url, timeout=5)
                
                if health_response.status_code != 200:
                    return {
                        "status": "error",
                        "message": f"Health check failed: {health_response.status_code} {health_response.text}",
                        "tools": []
                    }
            except Exception as e:
                return {
                    "status": "error",
                    "message": f"Service unavailable: {str(e)}",
                    "tools": []
                }
                
            # Get tools
            try:
                tools_url = urljoin(base_url, "/mcp/tools")
                tools_response = requests.get(tools_url, timeout=5)
                
                if tools_response.status_code != 200:
                    return {
                        "status": "error",
                        "message": f"Failed to get tools: {tools_response.status_code} {tools_response.text}",
                        "tools": []
                    }
                    
                tools = tools_response.json()
                found_tools = {tool["name"] for tool in tools}
                
                # Check if all expected tools are found
                missing_tools = expected_tools - found_tools
                
                if missing_tools:
                    return {
                        "status": "warning",
                        "message": f"Missing expected tools: {', '.join(missing_tools)}",
                        "tools": list(found_tools)
                    }
                    
                return {
                    "status": "ok",
                    "message": f"Found all {len(expected_tools)} expected tools",
                    "tools": list(found_tools)
                }
                
            except Exception as e:
                return {
                    "status": "error",
                    "message": f"Error getting tools: {str(e)}",
                    "tools": []
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Unexpected error testing service: {str(e)}",
                "tools": []
            }
    
    async def test_agent_tools(self) -> Dict[str, Any]:
        """
        Test agent's tool discovery by connecting to the agent WebSocket
        and requesting available tools.
        
        Returns:
            Test results for the agent
        """
        try:
            # Create a dummy conversation
            conversation_id = "test-tools-integration"
            
            # Connect to the agent WebSocket
            uri = f"{AGENT_WS_URL}/ws/{conversation_id}"
            logger.info(f"Connecting to agent WebSocket: {uri}")
            
            async with websockets.connect(uri) as websocket:
                # Send a special message to request tools list
                message = {
                    "type": "system",
                    "action": "get_tools",
                    "conversation_id": conversation_id
                }
                await websocket.send(json.dumps(message))
                
                # Wait for response
                response = await websocket.recv()
                data = json.loads(response)
                
                if "tools" in data:
                    tools = data["tools"]
                    tool_names = {tool["name"] for tool in tools}
                    self.agent_tools = tool_names
                    
                    return {
                        "status": "ok",
                        "message": f"Found {len(tool_names)} tools",
                        "tools": list(tool_names)
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"No tools found in agent response: {data}",
                        "tools": []
                    }
                    
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error connecting to agent: {str(e)}",
                "tools": []
            }
    
    async def run_tests(self):
        """Run all tests and collect results."""
        # Test each service
        for service_name in self.services:
            logger.info(f"Testing service: {service_name}")
            result = await self.test_service(service_name)
            self.results[service_name] = result
            
            if self.verbose:
                logger.info(f"  Status: {result['status']}")
                logger.info(f"  Message: {result['message']}")
                logger.info(f"  Tools: {', '.join(result['tools'])}")
        
        # Test agent tools
        logger.info("Testing agent tools discovery")
        agent_result = await self.test_agent_tools()
        self.results["agent"] = agent_result
        
        if self.verbose:
            logger.info(f"  Status: {agent_result['status']}")
            logger.info(f"  Message: {agent_result['message']}")
            logger.info(f"  Tools: {', '.join(agent_result['tools'])}")
    
    def analyze_results(self):
        """Analyze test results to find missing tools and issues."""
        # Collect all tools from services
        all_service_tools = set()
        for service_name, result in self.results.items():
            if service_name != "agent":
                all_service_tools.update(result["tools"])
        
        # Find tools missing from agent
        agent_tools = set(self.results.get("agent", {}).get("tools", []))
        missing_from_agent = all_service_tools - agent_tools
        
        # Find tools in agent but not in services
        unknown_agent_tools = agent_tools - all_service_tools
        
        return {
            "missing_from_agent": missing_from_agent,
            "unknown_agent_tools": unknown_agent_tools
        }
    
    def print_report(self):
        """Print a formatted report of test results."""
        print("\n===== MCP TOOLS INTEGRATION TEST REPORT =====\n")
        
        # Create a table of service results
        table_data = []
        for service_name, result in self.results.items():
            if service_name != "agent":
                tools_count = len(result["tools"])
                expected_count = len(SERVICE_CONFIGS.get(service_name, {}).get("expected_tools", []))
                
                status_display = {
                    "ok": "✅ OK",
                    "warning": "⚠️ WARNING",
                    "error": "❌ ERROR"
                }.get(result["status"], result["status"])
                
                table_data.append([
                    service_name,
                    status_display,
                    f"{tools_count}/{expected_count}",
                    result["message"]
                ])
        
        print(tabulate(
            table_data,
            headers=["Service", "Status", "Tools Found", "Message"],
            tablefmt="pretty"
        ))
        
        # Agent tools summary
        agent_result = self.results.get("agent", {"status": "not_tested", "message": "Not tested", "tools": []})
        agent_status = {
            "ok": "✅ OK",
            "warning": "⚠️ WARNING",
            "error": "❌ ERROR",
            "not_tested": "❓ NOT TESTED"
        }.get(agent_result["status"], agent_result["status"])
        
        print(f"\nAgent Tools Discovery: {agent_status}")
        print(f"  {agent_result['message']}")
        
        # Analysis of missing tools
        analysis = self.analyze_results()
        missing_tools = analysis["missing_from_agent"]
        unknown_tools = analysis["unknown_agent_tools"]
        
        if missing_tools:
            print("\n⚠️ Tools available in services but NOT discovered by agent:")
            for tool in sorted(missing_tools):
                print(f"  - {tool}")
        
        if unknown_tools:
            print("\n⚠️ Tools available in agent but NOT found in any service:")
            for tool in sorted(unknown_tools):
                print(f"  - {tool}")
        
        # Final summary
        all_ok = all(r["status"] == "ok" for r in self.results.values())
        if all_ok and not missing_tools:
            print("\n✅ All tests passed successfully!")
        else:
            print("\n⚠️ Some tests failed or warnings were found.")
            
            # Recommend next steps
            if missing_tools:
                print("\nRecommended actions:")
                print("  1. Check that all MCP services are running")
                print("  2. Verify that the agent can reach all MCP services")
                print("  3. Force refresh agent tools with: python refresh_agent_tools.py")

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Test MCP tool interfaces across all services")
    parser.add_argument("-s", "--services", nargs="+", help="Specific services to test")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose output")
    return parser.parse_args()

async def main():
    """Main entry point."""
    args = parse_args()
    tester = MCPToolsTester(services=args.services, verbose=args.verbose)
    await tester.run_tests()
    tester.print_report()

if __name__ == "__main__":
    asyncio.run(main())