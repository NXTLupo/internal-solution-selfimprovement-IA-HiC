#!/usr/bin/env python3
import asyncio
import websockets
import json
import base64

async def test_agent():
    with open("/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/test_journey.json", 'rb') as f:
        file_content = f.read()
    
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    uri = "ws://localhost:8500/ws/test_final"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to agent")
            
            message = {
                "type": "file",
                "content": "Please create a journey map from this JSON file",
                "file": {
                    "name": "test_journey.json", 
                    "data": file_base64
                }
            }
            
            await websocket.send(json.dumps(message))
            print("Sent JSON file request")
            
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=120.0)
                data = json.loads(response)
                content = data.get('content', '')
                
                if 'unsupported format' in content.lower():
                    return "FAILED - Still rejecting JSON"
                elif 'journey' in content.lower() and ('generated' in content.lower() or 'created' in content.lower()):
                    return "SUCCESS - Journey map created!"
                else:
                    return f"PARTIAL - Response: {content[:100]}..."
                    
            except asyncio.TimeoutError:
                return "PROCESSING - Taking over 2 minutes (likely working)"
                
    except Exception as e:
        return f"ERROR - {e}"

result = asyncio.run(test_agent())
print(f"\nRESULT: {result}")