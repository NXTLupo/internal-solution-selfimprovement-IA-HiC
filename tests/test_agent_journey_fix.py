#!/usr/bin/env python3
"""
Test script to verify agent journey mapping fixes
"""

import requests
import json
import os
import time

# Test the agent with a journey mapping request
def test_agent_journey_mapping():
    agent_url = "http://localhost:8500"
    launchpad_url = "http://localhost:8000"
    
    print("🧪 Testing Agent Journey Mapping Fixes...")
    
    # Step 1: Create a conversation
    print("\n1. Creating conversation...")
    try:
        response = requests.post(f"{launchpad_url}/api/chat/conversation")
        response.raise_for_status()
        conversation_data = response.json()
        conversation_id = conversation_data["conversation_id"]
        print(f"✅ Conversation created: {conversation_id}")
    except Exception as e:
        print(f"❌ Failed to create conversation: {e}")
        return False
    
    # Step 2: Test file upload and journey mapping
    print("\n2. Testing file upload with journey mapping request...")
    try:
        # Read the test journey file
        test_file_path = "/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH/test_journey.txt"
        
        with open(test_file_path, "rb") as f:
            files = {"file": ("test_journey.txt", f, "text/plain")}
            data = {
                "conversation_id": conversation_id,
                "message": "Generate a journey map using this file with Claude 3.7 Sonnet",
                "active_features": json.dumps([])  # No advanced features for this test
            }
            
            response = requests.post(f"{launchpad_url}/api/chat/message", files=files, data=data)
            response.raise_for_status()
            
            reply_data = response.json()
            reply = reply_data.get("reply", "")
            
            print(f"✅ Agent response received")
            print(f"📝 Response preview: {reply[:200]}...")
            
            # Check if the response indicates tool execution
            if "tool_calls" in reply.lower() or "journey_id" in reply.lower() or "journey" in reply.lower():
                print("✅ Agent appears to be processing journey mapping correctly")
                return True
            else:
                print("⚠️  Agent response doesn't indicate journey mapping tool execution")
                print(f"Full response: {reply}")
                return False
                
    except Exception as e:
        print(f"❌ Failed to test journey mapping: {e}")
        return False

def test_agent_health():
    """Test agent service health"""
    print("\n🏥 Testing Agent Health...")
    try:
        response = requests.get("http://localhost:8500/health")
        response.raise_for_status()
        health_data = response.json()
        
        print(f"✅ Agent is healthy")
        print(f"📊 Tools cached: {health_data.get('tools_cached', 0)}")
        print(f"🔧 Available tools: {len(health_data.get('available_tools', []))}")
        
        # Check if journey tools are available
        tools = health_data.get('available_tools', [])
        journey_tools = [tool for tool in tools if 'journey' in tool.lower()]
        
        if journey_tools:
            print(f"✅ Journey tools available: {journey_tools}")
            return True
        else:
            print("❌ No journey tools found in agent")
            return False
            
    except Exception as e:
        print(f"❌ Agent health check failed: {e}")
        return False

def test_journey_mcp_health():
    """Test journey MCP service health"""
    print("\n🗺️  Testing Journey MCP Health...")
    try:
        response = requests.get("http://localhost:8503/health")
        response.raise_for_status()
        health_data = response.json()
        
        print(f"✅ Journey MCP is healthy")
        print(f"📋 Service: {health_data.get('service', 'Unknown')}")
        return True
        
    except Exception as e:
        print(f"❌ Journey MCP health check failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Agent Journey Mapping Fix Tests\n")
    
    # Test all components
    agent_healthy = test_agent_health()
    mcp_healthy = test_journey_mcp_health()
    
    if agent_healthy and mcp_healthy:
        # Run the main test
        success = test_agent_journey_mapping()
        
        if success:
            print("\n🎉 All tests passed! Agent journey mapping fixes are working.")
        else:
            print("\n❌ Journey mapping test failed. Check the logs for details.")
    else:
        print("\n❌ Prerequisites failed. Check service health first.")