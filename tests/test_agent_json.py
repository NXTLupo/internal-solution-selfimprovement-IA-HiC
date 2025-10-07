#!/usr/bin/env python3
"""
Test script to verify agent handles JSON files correctly for journey mapping
"""
import asyncio
import websockets
import json
import base64
import os

async def test_agent_json_handling():
    """Test that the agent accepts JSON files for journey mapping"""
    
    # Read the test JSON file
    json_file_path = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/test_journey.json"
    with open(json_file_path, 'rb') as f:
        file_content = f.read()
    
    # Encode file content as base64
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    
    # Connect to agent WebSocket
    uri = "ws://localhost:8500/ws/test_session_json"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to agent WebSocket")
            
            # Send message with file upload (correct format for agent)
            message = {
                "type": "file",
                "content": "I need to upload this JSON file for journey mapping. Can you process it and generate a journey map?",
                "file": {
                    "name": "test_journey.json",
                    "data": file_base64
                }
            }
            
            await websocket.send(json.dumps(message))
            print("Sent JSON file upload request")
            
            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=60.0)
                response_data = json.loads(response)
            except asyncio.TimeoutError:
                print("❌ TIMEOUT: Agent didn't respond within 30 seconds")
                return False
            
            print("\n=== AGENT RESPONSE ===")
            print(f"Type: {response_data.get('type')}")
            print(f"Content: {response_data.get('content', '')}")
            
            # Check if agent tries to use journey_upload_file tool
            if "journey_upload_file" in response_data.get('content', ''):
                print("\n✅ SUCCESS: Agent attempted to use journey_upload_file tool")
                return True
            elif "unsupported format" in response_data.get('content', '').lower():
                print("\n❌ FAILURE: Agent still rejecting JSON files as unsupported")
                return False
            elif "unable to process" in response_data.get('content', '').lower():
                print("\n❌ FAILURE: Agent still rejecting file without trying tool")
                return False
            else:
                print("\n⚠️  UNCLEAR: Response doesn't clearly indicate success or failure")
                print(f"Full response: {response_data}")
                return False
                
    except Exception as e:
        print(f"Error testing agent: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_agent_json_handling())
    if success:
        print("\n🎉 Agent is now correctly handling JSON files!")
    else:
        print("\n💥 Agent still has issues with JSON file handling")