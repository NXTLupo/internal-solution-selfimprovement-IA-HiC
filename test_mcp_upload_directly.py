#!/usr/bin/env python3
"""
Test direct upload to journey MCP service to see the real error
"""
import requests
import json

def test_mcp_upload():
    """Test uploading directly to the journey MCP service"""
    url = "http://localhost:8503/mcp/invoke/journey_upload_file"
    
    # Create a test JSON file
    test_json = {
        "title": "Test Journey",
        "description": "Testing MCP upload",
        "stages": ["Discovery", "Consideration", "Purchase"]
    }
    
    # Test 1: Upload as proper multipart file
    print("Testing MCP Service Direct Upload...")
    print("=" * 50)
    
    try:
        # Create file-like object
        files = {
            'file': ('test.json', json.dumps(test_json, indent=2), 'application/json')
        }
        
        print(f"Uploading to: {url}")
        print(f"Test JSON content: {json.dumps(test_json, indent=2)}")
        
        response = requests.post(url, files=files)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Text: {response.text}")
        
        if response.status_code == 422:
            print("\n❌ 422 ERROR DETAILS:")
            try:
                error_data = response.json()
                print(f"Error JSON: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error Text: {response.text}")
        elif response.status_code == 200:
            print("\n✅ SUCCESS - MCP service working correctly")
            result = response.json()
            print(f"Upload result: {json.dumps(result, indent=2)}")
        else:
            print(f"\n❌ HTTP {response.status_code} ERROR: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    test_mcp_upload()