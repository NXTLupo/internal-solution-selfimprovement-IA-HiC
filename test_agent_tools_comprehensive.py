#!/usr/bin/env python3
"""
Comprehensive Agent Tools Test
============================
Tests that all MCP tools are properly available to the agent and working correctly.
This test verifies all the fixes for the chatbot integration issues.
"""

import asyncio
import httpx
import json
import sys
import os
from typing import Dict, List, Any

# Configuration
AGENT_URL = os.environ.get("AGENT_URL", "http://localhost:8500")
MCP_SERVICES = {
    "reddit-mcp": "http://localhost:8501",
    "social-mcp": "http://localhost:8502", 
    "journey-mcp": "http://localhost:8503",
    "video-mcp": "http://localhost:8504",
    "openai-journey-mcp": "http://localhost:8505",
    "claude4-journey-mcp": "http://localhost:8506"
}

EXPECTED_TOOLS = {
    "reddit.search": "reddit-mcp",
    "reddit.get_status": "reddit-mcp",
    "reddit.get_results": "reddit-mcp",
    "social.search": "social-mcp",
    "social.topic_model": "social-mcp", 
    "social.sentiment_analysis": "social-mcp",
    "journey.upload_file": "journey-mcp",
    "journey.generate_map": "journey-mcp",
    "journey.get_status": "journey-mcp",
    "journey.get_results": "journey-mcp",
    "journey.list_maps": "journey-mcp",
    "video.transcribe": "video-mcp",
    "video.get_status": "video-mcp",
    "video.get_results": "video-mcp",
    "openai_journey.upload_file": "openai-journey-mcp",
    "openai_journey.generate_map": "openai-journey-mcp",
    "openai_journey.get_results": "openai-journey-mcp",
    "openai_journey.list_maps": "openai-journey-mcp",
    "claude4_journey.upload_file": "claude4-journey-mcp",
    "claude4_journey.generate_map": "claude4-journey-mcp",
    "claude4_journey.get_status": "claude4-journey-mcp",
    "claude4_journey.get_results": "claude4-journey-mcp",
    "claude4_journey.list_maps": "claude4-journey-mcp"
}

async def test_service_health(service_name: str, service_url: str) -> bool:
    """Test if a service is healthy"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{service_url}/health", timeout=5)
            if response.status_code == 200:
                print(f"✅ {service_name} is healthy")
                return True
            else:
                print(f"❌ {service_name} health check failed: {response.status_code}")
                return False
    except Exception as e:
        print(f"❌ {service_name} is not accessible: {str(e)}")
        return False

async def test_service_tools(service_name: str, service_url: str) -> List[str]:
    """Get available tools from a service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{service_url}/mcp/tools", timeout=5)
            if response.status_code == 200:
                tools = response.json()
                tool_names = [tool.get("name", "unknown") for tool in tools]
                print(f"✅ {service_name} tools: {', '.join(tool_names)}")
                return tool_names
            else:
                print(f"❌ {service_name} tools endpoint failed: {response.status_code}")
                return []
    except Exception as e:
        print(f"❌ {service_name} tools not accessible: {str(e)}")
        return []

async def test_agent_health() -> bool:
    """Test agent health and tool discovery"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{AGENT_URL}/health", timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                print(f"✅ Agent is healthy")
                print(f"   Model: {health_data.get('model', 'unknown')}")
                print(f"   Tools cached: {health_data.get('tools_cached', 0)}")
                
                available_tools = health_data.get('available_tools', [])
                if available_tools:
                    print(f"   Available tools: {', '.join(available_tools)}")
                    return True
                else:
                    print(f"❌ Agent has no tools cached!")
                    return False
            else:
                print(f"❌ Agent health check failed: {response.status_code}")
                return False
    except Exception as e:
        print(f"❌ Agent is not accessible: {str(e)}")
        return False

async def test_agent_video_tools() -> bool:
    """Test that agent acknowledges having video tools"""
    try:
        conversation_data = {"message": "what tools do you use"}
        
        async with httpx.AsyncClient() as client:
            # Create conversation
            conv_response = await client.post(f"{AGENT_URL}/api/chat/conversation")
            if conv_response.status_code != 200:
                print(f"❌ Failed to create conversation: {conv_response.status_code}")
                return False
                
            conversation_id = conv_response.json()["conversation_id"]
            
            # Send message asking about tools
            form_data = {
                "conversation_id": conversation_id,
                "message": "what tools do you use"
            }
            
            msg_response = await client.post(f"{AGENT_URL}/api/chat/message", data=form_data, timeout=30)
            if msg_response.status_code == 200:
                reply = msg_response.json()["reply"]
                
                # Check if video tools are mentioned
                if "video" in reply.lower() and "transcrib" in reply.lower():
                    print("✅ Agent correctly mentions video transcription tools")
                    return True
                else:
                    print("❌ Agent does not mention video tools properly")
                    print(f"   Agent response: {reply[:200]}...")
                    return False
            else:
                print(f"❌ Failed to send message to agent: {msg_response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing agent video tools: {str(e)}")
        return False

async def test_tool_coverage() -> Dict[str, bool]:
    """Test that all expected tools are available"""
    # Get all available tools from each service
    available_tools = []
    
    for service_name, service_url in MCP_SERVICES.items():
        tools = await test_service_tools(service_name, service_url)
        available_tools.extend(tools)
    
    # Check coverage
    results = {}
    for expected_tool, service in EXPECTED_TOOLS.items():
        if expected_tool in available_tools:
            results[expected_tool] = True
            print(f"✅ {expected_tool} is available")
        else:
            results[expected_tool] = False
            print(f"❌ {expected_tool} is missing")
    
    return results

async def main():
    """Run comprehensive tests"""
    print("🧪 Starting Comprehensive Agent Tools Test")
    print("=" * 50)
    
    # Test 1: Service Health
    print("\n🏥 Testing Service Health")
    print("-" * 30)
    
    health_results = {}
    for service_name, service_url in MCP_SERVICES.items():
        health_results[service_name] = await test_service_health(service_name, service_url)
    
    # Test 2: Agent Health
    print("\n🤖 Testing Agent Health")
    print("-" * 30)
    agent_healthy = await test_agent_health()
    
    # Test 3: Tool Coverage
    print("\n🔧 Testing Tool Coverage")
    print("-" * 30)
    tool_results = await test_tool_coverage()
    
    # Test 4: Agent Video Tool Acknowledgment
    print("\n📹 Testing Agent Video Tool Acknowledgment")
    print("-" * 30)
    video_test = await test_agent_video_tools()
    
    # Summary
    print("\n📊 Test Summary")
    print("=" * 50)
    
    healthy_services = sum(health_results.values())
    total_services = len(health_results)
    available_tools = sum(tool_results.values()) 
    total_tools = len(tool_results)
    
    print(f"Service Health: {healthy_services}/{total_services} services healthy")
    print(f"Agent Health: {'✅ Healthy' if agent_healthy else '❌ Unhealthy'}")
    print(f"Tool Coverage: {available_tools}/{total_tools} tools available")
    print(f"Video Tools: {'✅ Working' if video_test else '❌ Not working'}")
    
    # Overall result
    all_tests_passed = (
        healthy_services == total_services and
        agent_healthy and
        available_tools == total_tools and
        video_test
    )
    
    if all_tests_passed:
        print("\n🎉 ALL TESTS PASSED! The agent integration is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED! Please check the issues above.")
        
        # Specific recommendations
        if not agent_healthy:
            print("\n💡 Recommendations:")
            print("   - Check if agent service is running")
            print("   - Verify ANTHROPIC_API_KEY is set")
            print("   - Check agent logs for errors")
        
        if healthy_services < total_services:
            print("\n💡 Recommendations:")
            print("   - Check which services failed health checks")
            print("   - Verify all services are running with docker-compose")
            print("   - Check service-specific logs")
        
        if available_tools < total_tools:
            print("\n💡 Recommendations:")
            print("   - Check which tools are missing")
            print("   - Verify MCP service endpoints are working")
            print("   - Run agent /refresh-tools endpoint")
        
        if not video_test:
            print("\n💡 Recommendations:")
            print("   - Check if video-mcp service is running")
            print("   - Verify agent system message includes video tools")
            print("   - Check agent tool discovery process")
        
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())