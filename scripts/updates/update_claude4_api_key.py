#!/usr/bin/env python3
import os
import sys
import requests

def update_api_key(api_key):
    """Update the API key for Claude 4 Journey Mapper service"""
    url = "http://localhost:8095/update-api-key"
    payload = {"api_key": api_key}
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml,application/xml"
    }
    
    try:
        response = requests.post(url, data=payload, headers=headers)
        if response.status_code == 200:
            print("API key updated successfully!")
            return True
        else:
            print(f"Failed to update API key. Status code: {response.status_code}")
            print(f"Response: {response.text[:200]}...")  # Print first 200 chars of response
            return False
    except Exception as e:
        print(f"Error updating API key: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
    else:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    
    update_api_key(api_key)