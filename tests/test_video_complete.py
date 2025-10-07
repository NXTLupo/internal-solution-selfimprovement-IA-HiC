#!/usr/bin/env python3
"""
Test complete video transcription workflow
"""
import asyncio
import websockets
import json

async def test_complete_video_workflow():
    uri = "ws://localhost:8500/ws/test_complete_video"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to agent WebSocket")
            
            # Send video transcription request
            message = {
                "type": "message",
                "content": "Take this video and transcribe it for me: https://www.youtube.com/watch?v=zZV_cn7cig8"
            }
            
            await websocket.send(json.dumps(message))
            print("✅ Sent video transcription request")
            
            response_count = 0
            
            # Wait for multiple responses
            try:
                while response_count < 2:  # Expect acknowledgment + final result
                    response = await asyncio.wait_for(websocket.recv(), timeout=300.0)  # 5 minute timeout
                    response_data = json.loads(response)
                    response_count += 1
                    
                    print(f"\n📩 Response {response_count}:")
                    content = response_data.get('content', '')
                    print(f"Content: {content[:150]}...")
                    
                    if response_count == 1:
                        # First response should be acknowledgment
                        if "start transcribing" in content.lower():
                            print("✅ Got immediate acknowledgment")
                        else:
                            print("⚠️  Unexpected first response")
                    elif response_count == 2:
                        # Second response should be the transcription result
                        if "transcript" in content.lower() or "transcription" in content.lower():
                            print("✅ Got transcription result!")
                            return "SUCCESS - Complete workflow working"
                        else:
                            print("⚠️  Second response doesn't seem to be transcription result")
                            return f"PARTIAL - Got responses but unclear content: {content[:100]}"
                            
            except asyncio.TimeoutError:
                if response_count == 1:
                    return "PARTIAL - Got acknowledgment but transcription taking too long"
                else:
                    return "TIMEOUT - No response within 5 minutes"
                
    except Exception as e:
        return f"ERROR - {e}"

result = asyncio.run(test_complete_video_workflow())
print(f"\n🎯 FINAL RESULT: {result}")