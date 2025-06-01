#!/usr/bin/env python3
"""
Test video transcription through agent
"""
import asyncio
import websockets
import json

async def test_video_transcription():
    uri = "ws://localhost:8500/ws/test_video_session"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to agent WebSocket")
            
            # Send video transcription request
            message = {
                "type": "message",
                "content": "Take this video and transcribe it for me: https://www.youtube.com/watch?v=zZV_cn7cig8"
            }
            
            await websocket.send(json.dumps(message))
            print("Sent video transcription request")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=120.0)
                response_data = json.loads(response)
                
                print(f"\nAgent Response Type: {response_data.get('type')}")
                content = response_data.get('content', '')
                print(f"Content: {content[:200]}...")
                
                if 'video_transcribe' in content or 'transcription' in content.lower():
                    return "SUCCESS - Agent attempting video transcription"
                else:
                    return f"ISSUE - Response: {content}"
                    
            except asyncio.TimeoutError:
                return "TIMEOUT - Agent didn't respond"
                
    except Exception as e:
        return f"ERROR - {e}"

result = asyncio.run(test_video_transcription())
print(f"\nResult: {result}")