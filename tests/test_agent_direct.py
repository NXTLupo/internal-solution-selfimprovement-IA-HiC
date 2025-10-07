#!/usr/bin/env python3
"""
Direct test of agent functionality to debug tool execution issues
"""
import requests
import json

def test_agent_direct():
    """Test sending a message directly to the agent service"""
    url = "http://localhost:8500/api/chat/message"
    
    test_cases = [
        {
            'conversation_id': 'test-1',
            'message': 'take the last video transcript and upload the json file to the journey mapper app',
            'description': 'Complex workflow test'
        },
        {
            'conversation_id': 'test-2', 
            'message': 'list all available video transcripts',
            'description': 'Simple tool call test'
        },
        {
            'conversation_id': 'test-3',
            'message': 'hello, how can you help me?',
            'description': 'No tool call test'
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*50}")
        print(f"TEST {i}: {test_case['description']}")
        print(f"Message: {test_case['message']}")
        print(f"{'='*50}")
        
        try:
            response = requests.post(url, data=test_case)
            print(f"Status: {response.status_code}")
            
            if response.headers.get('content-type', '').startswith('application/json'):
                response_data = response.json()
                reply = response_data.get('reply', '')
                
                # Check for JSON in response
                has_json = '```json' in reply or reply.strip().startswith('{')
                status = "❌ CONTAINS JSON" if has_json else "✅ CLEAN RESPONSE"
                
                print(f"Result: {status}")
                print(f"Reply: {reply}")
                
                if has_json:
                    print("⚠️  JSON found in response - fix needed!")
                    
            else:
                print(f"Non-JSON Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_agent_direct()