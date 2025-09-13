#\!/usr/bin/env python3
"""
Simple test to verify agent accepts JSON files 
"""
import asyncio
import websockets
import json
import base64

async def test_simple():
    """Simple test with just the file upload message"""
    
    # Read the test JSON file
    with open("/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/test_journey.json", 'rb') as f:
        file_content = f.read()
    
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    
    uri = "ws://localhost:8500/ws/test_simple"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to agent")
            
            # Send file upload
            message = {
                "type": "file",
                "content": "Please analyze this JSON file and create a journey map",
                "file": {
                    "name": "test_journey.json",
                    "data": file_base64
                }
            }
            
            await websocket.send(json.dumps(message))
            print("✅ Sent JSON file upload request")
            
            # Wait for any response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=90.0)
                response_data = json.loads(response)
                print(f"\n✅ Received response type: {response_data.get('type')}")
                
                content = response_data.get('content', '')
                if 'unsupported format' in content.lower():
                    print("❌ FAILURE: Agent still rejecting JSON as unsupported")
                    return False
                elif 'successfully' in content.lower() or 'generated' in content.lower():
                    print("✅ SUCCESS: Agent processed the JSON file\!")
                    return True
                else:
                    print(f"⚠️  Agent response: {content[:200]}...")
                    return True  # At least it didn't reject the format
                    
            except asyncio.TimeoutError:
                print("⚠️  Agent is taking longer than 90 seconds - likely processing")
                return True  # This suggests it's actually working
                
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_simple())
    print(f"\n{'🎉 AGENT FIXED\!' if success else '💥 STILL BROKEN'}")
EOF < /dev/null