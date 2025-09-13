#!/usr/bin/env python3
"""
Test journey-mcp service directly to verify endpoint fixes
"""
import requests
import json

def test_journey_mcp_direct():
    """Test journey-mcp service directly"""
    
    # Step 1: Upload file
    print("=== Testing file upload ===")
    
    json_file_path = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/test_journey.json"
    
    with open(json_file_path, 'rb') as f:
        files = {'file': ('test_journey.json', f, 'application/json')}
        data = {'file_name': 'test_journey.json'}
        
        response = requests.post(
            'http://localhost:8503/mcp/invoke/journey_upload_file',
            files=files,
            data=data
        )
    
    print(f"Upload response status: {response.status_code}")
    print(f"Upload response: {response.text}")
    
    if response.status_code != 200:
        return False
        
    result = response.json()
    file_id = result.get('file_id')
    print(f"File ID: {file_id}")
    
    # Step 2: Generate journey map
    print("\n=== Testing journey map generation ===")
    
    data = {
        'file_id': file_id,
        'journey_name': 'Test Journey Map',
        'description': 'Testing JSON file processing'
    }
    
    response = requests.post(
        'http://localhost:8503/mcp/invoke/journey_generate_map',
        data=data
    )
    
    print(f"Generation response status: {response.status_code}")
    print(f"Generation response: {response.text}")
    
    return response.status_code == 200

if __name__ == "__main__":
    success = test_journey_mcp_direct()
    if success:
        print("\n🎉 Journey MCP service is working!")
    else:
        print("\n💥 Journey MCP service still has issues")