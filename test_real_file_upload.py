#!/usr/bin/env python3
"""
Test actual file upload to agent to simulate what user experienced
"""
import requests
import json
import tempfile
import os

def test_real_file_upload():
    """Test uploading an actual JSON file to the agent"""
    url = "http://localhost:8500/api/chat/message"
    
    # Create a real JSON file
    test_json = {
        "title": "Test Journey Map",
        "description": "Testing real file upload",
        "customer_data": {
            "touchpoints": ["website", "email", "support"],
            "pain_points": ["slow loading", "confusing navigation"]
        }
    }
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(test_json, f, indent=2)
        temp_file_path = f.name
    
    try:
        print("Testing Real File Upload to Agent...")
        print("=" * 50)
        print(f"JSON content: {json.dumps(test_json, indent=2)}")
        print(f"Temp file: {temp_file_path}")
        
        # Upload the file to the agent
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('test_journey.json', f, 'application/json')}
            data = {
                'conversation_id': 'file-upload-test',
                'message': 'I uploaded a JSON file. Please process it with the journey mapper.'
            }
            
            response = requests.post(url, files=files, data=data)
            
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            reply = response_data.get('reply', '')
            print(f"Agent Reply: {reply}")
            
            # Check if it mentions the correct workflow
            if "step 1" in reply.lower() and "step 2" in reply.lower():
                print("\n✅ Agent using correct two-step workflow")
            elif "syntax error" in reply.lower():
                print("\n❌ Agent still reporting fake JSON syntax errors")
            elif "upload" in reply.lower() and "journey" in reply.lower():
                print("\n✅ Agent properly processing file upload")
            else:
                print("\n❓ Agent response unclear")
        else:
            print(f"HTTP Error: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    test_real_file_upload()