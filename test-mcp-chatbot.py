#!/usr/bin/env python3
"""
Test script for MCP Chatbot implementation
------------------------------------------
This script tests the new MCP-compliant chatbot functionality
"""

import os
import sys
import requests
import json
import time

def test_mcp_chatbot():
    """Test the MCP chatbot functionality"""
    
    print("🧪 Testing MCP Chatbot Implementation")
    print("=" * 50)
    
    # Base URL for the launchpad
    base_url = "http://localhost:8000"
    
    try:
        # Test 1: Check if launchpad is running
        print("\n1. Testing Launchpad Connection...")
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print("✅ Launchpad is running")
        else:
            print(f"❌ Launchpad error: {response.status_code}")
            return False
        
        # Test 2: Check MCP servers status
        print("\n2. Testing MCP Servers Status...")
        response = requests.get(f"{base_url}/api/mcp/servers", timeout=10)
        if response.status_code == 200:
            servers = response.json().get("servers", {})
            print(f"✅ MCP servers endpoint working")
            for server_name, status in servers.items():
                status_icon = "✅" if status["status"] == "online" else "❌" if status["status"] == "offline" else "⚠️"
                print(f"  {status_icon} {server_name}: {status['status']}")
        else:
            print(f"❌ MCP servers check failed: {response.status_code}")
        
        # Test 3: Check if Anthropic API key is configured
        print("\n3. Testing Anthropic API Configuration...")
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if api_key:
            print("✅ Anthropic API key is configured")
        else:
            print("❌ Anthropic API key is not set")
            print("   Please set ANTHROPIC_API_KEY environment variable")
            return False
        
        # Test 4: Create MCP conversation
        print("\n4. Testing MCP Conversation Creation...")
        response = requests.post(f"{base_url}/api/mcp/conversation", 
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        if response.status_code == 200:
            data = response.json()
            conversation_id = data.get("conversation_id")
            print(f"✅ MCP conversation created: {conversation_id}")
        else:
            print(f"❌ Failed to create MCP conversation: {response.status_code}")
            if response.text:
                print(f"   Error: {response.text}")
            return False
        
        # Test 5: Send test message
        print("\n5. Testing MCP Message Sending...")
        test_message = "Hello! Can you tell me what tools you have available?"
        
        response = requests.post(f"{base_url}/api/mcp/message",
                               headers={"Content-Type": "application/json"},
                               json={
                                   "conversation_id": conversation_id,
                                   "message": test_message
                               },
                               timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            assistant_response = data.get("response", "")
            print("✅ MCP message sent successfully")
            print(f"📝 Assistant response: {assistant_response[:200]}...")
        else:
            print(f"❌ Failed to send MCP message: {response.status_code}")
            if response.text:
                print(f"   Error: {response.text}")
            return False
        
        # Test 6: Test MCP chatbot interface
        print("\n6. Testing MCP Chatbot Interface...")
        response = requests.get(f"{base_url}/mcp-chat", timeout=5)
        if response.status_code == 200:
            print("✅ MCP chatbot interface is accessible")
            print(f"🌐 Visit: {base_url}/mcp-chat")
        else:
            print(f"❌ MCP chatbot interface error: {response.status_code}")
        
        print("\n" + "=" * 50)
        print("🎉 MCP Chatbot Test Completed Successfully!")
        print(f"🚀 Access the chatbot at: {base_url}/mcp-chat")
        print(f"📊 Check status at: {base_url}/status")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to launchpad. Is it running on port 8000?")
        print("   Try running: python launchpad/app.py")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking Dependencies...")
    
    required_packages = [
        "anthropic",
        "requests", 
        "flask"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - MISSING")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n📦 Install missing packages:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 NXT Humans MCP Chatbot Test Suite")
    print("=" * 50)
    
    # Check dependencies first
    if not check_dependencies():
        sys.exit(1)
    
    # Run tests
    if test_mcp_chatbot():
        print("\n✅ All tests passed! The MCP chatbot is ready to use.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the configuration.")
        sys.exit(1)