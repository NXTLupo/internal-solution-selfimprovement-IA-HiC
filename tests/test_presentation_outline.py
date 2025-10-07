#!/usr/bin/env python3
"""
Test script for presentation outline generation
"""
import requests
import json
import time

def test_outline_generation():
    """Test the presentation outline generation endpoint"""
    
    # Test data
    test_data = {
        "prompt": "Introduction to Artificial Intelligence",
        "numberOfCards": 5,
        "language": "English",
        "model": "gpt-4o"
    }
    
    url = "http://localhost:3002/api/presentation/outline"
    
    print(f"Testing outline generation...")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(test_data, indent=2)}")
    
    try:
        response = requests.post(
            url,
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Outline generation successful!")
            
            # Handle streaming response
            if response.headers.get('content-type', '').startswith('text/plain'):
                print("\n📄 Streaming Response:")
                print(response.text)
            else:
                try:
                    result = response.json()
                    print(f"\n📄 Response: {json.dumps(result, indent=2)}")
                except:
                    print(f"\n📄 Raw Response: {response.text}")
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_service_health():
    """Test if the presentation service is running"""
    try:
        response = requests.get("http://localhost:3002", timeout=5)
        print(f"Service status: {response.status_code}")
        return True
    except Exception as e:
        print(f"Service not accessible: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing NXT Humans Presentation Generator")
    print("=" * 50)
    
    if test_service_health():
        test_outline_generation()
    else:
        print("❌ Presentation service is not running on port 3002")
        print("Please start the service first with: cd presentation-ai && npm run dev")