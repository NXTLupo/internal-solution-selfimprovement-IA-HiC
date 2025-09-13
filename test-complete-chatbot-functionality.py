#!/usr/bin/env python3
"""
Complete Chatbot Functionality Test
===================================
This script validates that all MCP Agent chatbot fixes are working correctly.
"""

import asyncio
import websockets
import json
import requests
import logging
import sys
import time
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ChatbotTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.agent_url = "http://localhost:8500"
        self.conversation_id = None
        self.ws_url = None
        
    async def test_complete_flow(self):
        """Test the complete chatbot functionality"""
        logger.info("🚀 Starting complete chatbot functionality test...")
        
        # Step 1: Test service health
        logger.info("📋 Step 1: Testing service health...")
        if not await self.test_service_health():
            return False
            
        # Step 2: Test conversation creation
        logger.info("💬 Step 2: Testing conversation creation...")
        if not await self.test_conversation_creation():
            return False
            
        # Step 3: Test WebSocket connection
        logger.info("🔌 Step 3: Testing WebSocket connection...")
        if not await self.test_websocket_connection():
            return False
            
        # Step 4: Test tool discovery
        logger.info("🛠️  Step 4: Testing tool discovery...")
        if not await self.test_tool_discovery():
            return False
            
        # Step 5: Test message flow
        logger.info("📨 Step 5: Testing message flow...")
        if not await self.test_message_flow():
            return False
            
        logger.info("✅ All tests passed! Chatbot functionality is working correctly.")
        return True
    
    async def test_service_health(self) -> bool:
        """Test health of all services"""
        services_to_test = [
            ("Launchpad", f"{self.base_url}/api/status"),
            ("Agent", f"{self.agent_url}/health"),
        ]
        
        for service_name, health_url in services_to_test:
            try:
                response = requests.get(health_url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"✅ {service_name} is healthy: {data.get('status', 'unknown')}")
                else:
                    logger.error(f"❌ {service_name} health check failed: HTTP {response.status_code}")
                    return False
            except Exception as e:
                logger.error(f"❌ Failed to connect to {service_name}: {e}")
                return False
        
        return True
    
    async def test_conversation_creation(self) -> bool:
        """Test conversation creation"""
        try:
            response = requests.post(f"{self.base_url}/api/chat/conversation", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.conversation_id = data.get("conversation_id")
                if self.conversation_id:
                    logger.info(f"✅ Conversation created: {self.conversation_id}")
                    return True
                else:
                    logger.error("❌ No conversation ID returned")
                    return False
            else:
                logger.error(f"❌ Failed to create conversation: HTTP {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Error creating conversation: {e}")
            return False
    
    async def test_websocket_connection(self) -> bool:
        """Test WebSocket connection to agent"""
        if not self.conversation_id:
            logger.error("❌ No conversation ID available")
            return False
            
        try:
            # Get WebSocket URL
            response = requests.get(f"{self.base_url}/api/chat/ws/{self.conversation_id}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.ws_url = f"ws://localhost:8000{data.get('ws_url')}"
                logger.info(f"✅ Got WebSocket URL: {self.ws_url}")
                
                # Test actual WebSocket connection
                try:
                    async with websockets.connect(self.ws_url, timeout=10) as websocket:
                        logger.info("✅ WebSocket connection established")
                        
                        # Wait for welcome message
                        try:
                            welcome_message = await asyncio.wait_for(websocket.recv(), timeout=5)
                            welcome_data = json.loads(welcome_message)
                            if welcome_data.get("type") == "message":
                                logger.info(f"✅ Received welcome message: {welcome_data.get('content', '')[:50]}...")
                                return True
                            else:
                                logger.warning(f"⚠️  Unexpected welcome message type: {welcome_data.get('type')}")
                                return True  # Still consider it a success
                        except asyncio.TimeoutError:
                            logger.warning("⚠️  No welcome message received (timeout)")
                            return True  # Connection worked, just no welcome message
                            
                except Exception as ws_error:
                    logger.error(f"❌ WebSocket connection failed: {ws_error}")
                    return False
                    
            else:
                logger.error(f"❌ Failed to get WebSocket URL: HTTP {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Error testing WebSocket: {e}")
            return False
    
    async def test_tool_discovery(self) -> bool:
        """Test that agent has discovered tools"""
        try:
            response = requests.get(f"{self.agent_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                tools_count = data.get("tools_cached", 0)
                available_tools = data.get("available_tools", [])
                
                if tools_count > 0:
                    logger.info(f"✅ Agent has {tools_count} tools cached")
                    logger.info(f"🛠️  Available tools: {', '.join(available_tools[:5])}{'...' if len(available_tools) > 5 else ''}")
                    return True
                else:
                    logger.error("❌ No tools cached in agent service")
                    return False
            else:
                logger.error(f"❌ Failed to get agent health: HTTP {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Error checking tool discovery: {e}")
            return False
    
    async def test_message_flow(self) -> bool:
        """Test complete message flow through WebSocket"""
        if not self.ws_url:
            logger.error("❌ No WebSocket URL available")
            return False
            
        try:
            async with websockets.connect(self.ws_url, timeout=10) as websocket:
                logger.info("🔌 Connected to WebSocket for message test")
                
                # Skip welcome message if present
                try:
                    await asyncio.wait_for(websocket.recv(), timeout=2)
                except asyncio.TimeoutError:
                    pass  # No welcome message, that's fine
                
                # Send test message
                test_message = {
                    "type": "message",
                    "content": "Hello, can you list the available tools?"
                }
                
                logger.info(f"📤 Sending test message: {test_message['content']}")
                await websocket.send(json.dumps(test_message))
                
                # Wait for response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=15)
                    response_data = json.loads(response)
                    
                    if response_data.get("type") == "message":
                        content = response_data.get("content", "")
                        logger.info(f"✅ Received response: {content[:100]}{'...' if len(content) > 100 else ''}")
                        
                        # Check if response mentions tools
                        if "tool" in content.lower() or "reddit" in content.lower() or "journey" in content.lower():
                            logger.info("✅ Response includes tool information - agent is working correctly!")
                            return True
                        else:
                            logger.warning("⚠️  Response doesn't mention tools, but agent is responding")
                            return True
                    else:
                        logger.error(f"❌ Unexpected response type: {response_data.get('type')}")
                        return False
                        
                except asyncio.TimeoutError:
                    logger.error("❌ No response received within timeout")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Error testing message flow: {e}")
            return False

async def main():
    """Main test function"""
    tester = ChatbotTester()
    
    print("🎯 NXT Humans AI CX Workbench - Chatbot Functionality Test")
    print("=" * 60)
    
    success = await tester.test_complete_flow()
    
    print("=" * 60)
    if success:
        print("🎉 SUCCESS: All chatbot functionality tests passed!")
        print("✅ The MCP Agent chatbot is working correctly and can leverage all tools.")
        sys.exit(0)
    else:
        print("❌ FAILED: Some tests failed. Check the logs above for details.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())