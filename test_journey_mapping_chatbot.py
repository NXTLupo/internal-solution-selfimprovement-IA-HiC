#!/usr/bin/env python3
"""
Test journey mapping through the chatbot API
"""
import requests
import json
import time

def test_journey_mapping_workflow():
    """Test the complete journey mapping workflow"""
    base_url = "http://localhost:8000"
    
    # Step 1: Create conversation
    print("1. Creating conversation...")
    response = requests.post(f"{base_url}/api/chat/conversation")
    if response.status_code != 200:
        print(f"❌ Failed to create conversation: {response.status_code}")
        return False
    
    conv_data = response.json()
    conversation_id = conv_data.get("conversation_id")
    print(f"✅ Conversation created: {conversation_id}")
    
    # Step 2: Create a test JSON file
    test_data = {
        "customer_journey": {
            "title": "Test Customer Journey",
            "stages": [
                {"name": "Awareness", "touchpoints": ["Google Search", "Social Media"]},
                {"name": "Consideration", "touchpoints": ["Website", "Reviews"]},
                {"name": "Purchase", "touchpoints": ["Checkout", "Payment"]},
                {"name": "Support", "touchpoints": ["Help Center", "Chat"]}
            ]
        }
    }
    
    # Step 3: Test journey mapping request
    print("2. Testing journey mapping request...")
    
    # Create temporary file for upload
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_data, f, indent=2)
        temp_file_path = f.name
    
    try:
        # Send message with file upload
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('test_journey.json', f, 'application/json')}
            data = {
                'conversation_id': conversation_id,
                'message': 'Please create a journey map from this uploaded JSON file using the Claude 3.7 journey mapper.'
            }
            
            response = requests.post(f"{base_url}/api/chat/message", files=files, data=data)
            
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            reply_data = response.json()
            reply = reply_data.get('reply', '')
            print(f"Agent Reply: {reply[:500]}...")
            
            # Check if it mentions proper workflow
            if "journey" in reply.lower() and "map" in reply.lower():
                print("✅ Agent is processing journey mapping request")
                
                # Check if it mentions any errors
                if "error" in reply.lower() or "failed" in reply.lower():
                    print("⚠️ Agent mentions errors in response")
                    return False
                else:
                    print("✅ No error messages detected")
                    return True
            else:
                print("❌ Agent doesn't seem to understand journey mapping request")
                return False
        else:
            print(f"❌ Request failed: {response.text}")
            return False
            
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    print("Testing Journey Mapping Chatbot Workflow...")
    print("=" * 50)
    
    success = test_journey_mapping_workflow()
    
    if success:
        print("\n✅ Journey mapping chatbot test PASSED")
    else:
        print("\n❌ Journey mapping chatbot test FAILED")