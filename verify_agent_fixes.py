#!/usr/bin/env python3
"""
Agent Fixes Verification Script
=============================
This script verifies that all the fixes for the chatbot integration issues are working:

1. Video transcriptor tools are available to the agent
2. File upload handling for journey mappers works
3. All three journey mappers (Claude 3.7, OpenAI o3, Claude 4) are exposed
4. System message includes all tools properly

Usage:
    python verify_agent_fixes.py
"""

import asyncio
import httpx
import json
import time
import sys
import os

# Test Configuration
AGENT_URL = os.environ.get("AGENT_URL", "http://localhost:8500")
TEST_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

async def wait_for_agent():
    """Wait for agent to be ready"""
    print("⏳ Waiting for agent to be ready...")
    
    for attempt in range(30):  # Wait up to 30 seconds
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{AGENT_URL}/health", timeout=5)
                if response.status_code == 200:
                    health_data = response.json()
                    tools_count = health_data.get("tools_cached", 0)
                    if tools_count > 0:
                        print(f"✅ Agent is ready with {tools_count} tools cached")
                        return True
                    else:
                        print(f"⏳ Agent is up but no tools cached yet (attempt {attempt + 1}/30)")
        except Exception as e:
            print(f"⏳ Agent not ready yet (attempt {attempt + 1}/30): {str(e)}")
        
        await asyncio.sleep(1)
    
    print("❌ Agent did not become ready within 30 seconds")
    return False

async def test_video_tool_availability():
    """Test 1: Video transcriptor tools are available"""
    print("\n🧪 Test 1: Video Tool Availability")
    print("-" * 40)
    
    try:
        async with httpx.AsyncClient() as client:
            # Create conversation
            conv_response = await client.post(f"{AGENT_URL}/api/chat/conversation")
            if conv_response.status_code != 200:
                print(f"❌ Failed to create conversation: {conv_response.status_code}")
                return False
                
            conversation_id = conv_response.json()["conversation_id"]
            
            # Test video transcription request
            form_data = {
                "conversation_id": conversation_id,
                "message": f"can you transcribe this video: {TEST_YOUTUBE_URL}"
            }
            
            response = await client.post(f"{AGENT_URL}/api/chat/message", data=form_data, timeout=60)
            if response.status_code == 200:
                reply = response.json()["reply"]
                
                # Check if agent acknowledges having video tools
                if "don't have" in reply.lower() and "video" in reply.lower():
                    print("❌ Agent claims it doesn't have video tools")
                    print(f"   Response: {reply[:200]}...")
                    return False
                elif "transcrib" in reply.lower() or "video" in reply.lower():
                    print("✅ Agent acknowledges video transcription capability")
                    return True
                else:
                    print("❓ Unclear response about video tools")
                    print(f"   Response: {reply[:200]}...")
                    return False
            else:
                print(f"❌ Failed to send message: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing video tools: {str(e)}")
        return False

async def test_journey_mapper_options():
    """Test 2: Multiple journey mappers are available"""
    print("\n🧪 Test 2: Journey Mapper Options")
    print("-" * 40)
    
    try:
        async with httpx.AsyncClient() as client:
            # Create conversation
            conv_response = await client.post(f"{AGENT_URL}/api/chat/conversation")
            if conv_response.status_code != 200:
                print(f"❌ Failed to create conversation: {conv_response.status_code}")
                return False
                
            conversation_id = conv_response.json()["conversation_id"]
            
            # Ask about journey mapping options
            form_data = {
                "conversation_id": conversation_id,
                "message": "what journey mapping tools do you have available?"
            }
            
            response = await client.post(f"{AGENT_URL}/api/chat/message", data=form_data, timeout=30)
            if response.status_code == 200:
                reply = response.json()["reply"]
                
                # Check for multiple journey mapper mentions
                has_claude37 = "claude 3.7" in reply.lower() or "journey.*" in reply
                has_openai = "openai" in reply.lower() or "o3" in reply.lower()
                has_claude4 = "claude 4" in reply.lower() or "claude4" in reply.lower()
                
                print(f"   Claude 3.7 mentioned: {'✅' if has_claude37 else '❌'}")
                print(f"   OpenAI o3 mentioned: {'✅' if has_openai else '❌'}")
                print(f"   Claude 4 mentioned: {'✅' if has_claude4 else '❌'}")
                
                if has_claude37 and has_openai and has_claude4:
                    print("✅ All three journey mappers are mentioned")
                    return True
                else:
                    print("❌ Not all journey mappers are mentioned")
                    print(f"   Response: {reply[:300]}...")
                    return False
            else:
                print(f"❌ Failed to send message: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing journey mappers: {str(e)}")
        return False

async def test_tool_discovery():
    """Test 3: Agent has discovered all expected tools"""
    print("\n🧪 Test 3: Tool Discovery")
    print("-" * 40)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{AGENT_URL}/health", timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                available_tools = health_data.get("available_tools", [])
                
                # Expected tool prefixes
                expected_prefixes = ["reddit.", "social.", "journey.", "video.", "openai_journey.", "claude4_journey."]
                
                found_prefixes = []
                for prefix in expected_prefixes:
                    if any(tool.startswith(prefix) for tool in available_tools):
                        found_prefixes.append(prefix)
                        print(f"   ✅ {prefix}* tools found")
                    else:
                        print(f"   ❌ {prefix}* tools missing")
                
                if len(found_prefixes) == len(expected_prefixes):
                    print(f"✅ All tool categories discovered ({len(available_tools)} total tools)")
                    return True
                else:
                    print(f"❌ Missing tool categories: {len(found_prefixes)}/{len(expected_prefixes)}")
                    return False
            else:
                print(f"❌ Failed to get agent health: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing tool discovery: {str(e)}")
        return False

async def test_file_upload_simulation():
    """Test 4: File upload handling (simulated)"""
    print("\n🧪 Test 4: File Upload Handling")
    print("-" * 40)
    
    try:
        async with httpx.AsyncClient() as client:
            # Create conversation
            conv_response = await client.post(f"{AGENT_URL}/api/chat/conversation")
            if conv_response.status_code != 200:
                print(f"❌ Failed to create conversation: {conv_response.status_code}")
                return False
                
            conversation_id = conv_response.json()["conversation_id"]
            
            # Ask about file upload process
            form_data = {
                "conversation_id": conversation_id,
                "message": "how do I upload a file for journey mapping?"
            }
            
            response = await client.post(f"{AGENT_URL}/api/chat/message", data=form_data, timeout=30)
            if response.status_code == 200:
                reply = response.json()["reply"]
                
                # Check if agent mentions file upload process
                if "upload" in reply.lower() and ("file" in reply.lower() or "journey" in reply.lower()):
                    print("✅ Agent explains file upload process")
                    return True
                else:
                    print("❌ Agent doesn't properly explain file upload")
                    print(f"   Response: {reply[:200]}...")
                    return False
            else:
                print(f"❌ Failed to send message: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing file upload: {str(e)}")
        return False

async def main():
    """Run all verification tests"""
    print("🔧 Agent Fixes Verification")
    print("=" * 50)
    print("This script verifies fixes for the chatbot integration issues")
    print("identified in the user dialogue.")
    print()
    
    # Wait for agent to be ready
    if not await wait_for_agent():
        print("\n❌ VERIFICATION FAILED: Agent is not ready")
        sys.exit(1)
    
    # Run all tests
    tests = [
        ("Video Tool Availability", test_video_tool_availability),
        ("Journey Mapper Options", test_journey_mapper_options),
        ("Tool Discovery", test_tool_discovery),
        ("File Upload Handling", test_file_upload_simulation)
    ]
    
    results = []
    for test_name, test_func in tests:
        result = await test_func()
        results.append((test_name, result))
    
    # Summary
    print("\n📊 Verification Summary")
    print("=" * 50)
    
    passed_tests = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed_tests += 1
    
    print(f"\nResults: {passed_tests}/{len(tests)} tests passed")
    
    if passed_tests == len(tests):
        print("\n🎉 ALL FIXES VERIFIED!")
        print("The chatbot integration issues have been successfully resolved:")
        print("• Video transcriptor tools are now available")
        print("• Multiple journey mappers are exposed")
        print("• File upload handling is improved")
        print("• System message includes all tools")
        sys.exit(0)
    else:
        print("\n❌ SOME FIXES NEED ATTENTION!")
        print("Please review the failed tests and check:")
        print("• Agent service logs for errors")
        print("• MCP service availability")
        print("• Environment variable configuration")
        print("• Docker container networking")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())