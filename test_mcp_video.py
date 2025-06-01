#!/usr/bin/env python3
"""
Test video transcription through MCP API endpoint (simulating frontend)
"""
import requests
import time

def test_mcp_video_transcription():
    """Test video transcription through the MCP API that the frontend uses"""
    
    # First create a conversation
    print("🔄 Creating MCP conversation...")
    response = requests.post('http://localhost:8000/api/mcp/conversation')
    
    if response.status_code != 200:
        return f"FAILED to create conversation: {response.status_code} - {response.text}"
    
    conversation_data = response.json()
    conversation_id = conversation_data.get('conversation_id')
    print(f"✅ Created conversation: {conversation_id}")
    
    # Send video transcription request
    print("🔄 Sending video transcription request...")
    start_time = time.time()
    
    data = {
        'conversation_id': conversation_id,
        'message': 'transcribe this video: https://www.youtube.com/watch?v=ouaoJlh3DB4'
    }
    
    try:
        response = requests.post(
            'http://localhost:8000/api/mcp/message',
            data=data,
            timeout=320  # Give extra time for our test
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"⏱️  Request took {duration:.1f} seconds")
        
        if response.status_code == 200:
            result = response.json()
            response_content = result.get('reply', '') or result.get('response', '')
            
            print(f"📝 Response content: {response_content[:500]}...")
            
            if 'transcript' in response_content.lower():
                return f"SUCCESS - Got transcription result in {duration:.1f}s"
            else:
                return f"PARTIAL - Got response but no transcript content"
        else:
            return f"FAILED - HTTP {response.status_code}: {response.text}"
            
    except requests.exceptions.Timeout:
        return f"TIMEOUT - Request took longer than 320 seconds"
    except Exception as e:
        return f"ERROR - {e}"

if __name__ == "__main__":
    result = test_mcp_video_transcription()
    print(f"\n🎯 RESULT: {result}")