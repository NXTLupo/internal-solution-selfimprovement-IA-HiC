#!/usr/bin/env python3
"""
Test the agent's JSON file processing to identify the real issue
"""
import requests
import json

def test_agent_json_processing():
    """Test sending a simple JSON file to the agent to see what's wrong"""
    url = "http://localhost:8500/api/chat/message"
    
    # Create a simple, valid JSON file for testing
    test_json = {
        "title": "Test Journey Map",
        "description": "Testing JSON processing",
        "content": "This is a valid JSON file for testing the journey mapper"
    }
    
    # Test 1: Ask agent to process JSON content directly
    data = {
        'conversation_id': 'json-test-1',
        'message': f'Please process this JSON content and upload it to the journey mapper: {json.dumps(test_json)}'
    }
    
    print("Testing JSON Processing with Agent...")
    print("=" * 50)
    print(f"Test JSON: {json.dumps(test_json, indent=2)}")
    print()
    
    try:
        response = requests.post(url, data=data)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            reply = response_data.get('reply', '')
            print(f"Agent Reply: {reply}")
            
            # Check if agent still claims JSON syntax error
            if "syntax error" in reply.lower() or "json" in reply.lower():
                print("\n❌ AGENT BUG CONFIRMED: Agent incorrectly reporting JSON syntax errors")
            else:
                print("\n✅ Agent processed JSON correctly")
        else:
            print(f"HTTP Error: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_agent_json_processing()