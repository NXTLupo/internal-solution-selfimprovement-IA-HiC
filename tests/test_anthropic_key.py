#!/usr/bin/env python3
import os
import requests
import json

def test_anthropic_api():
    """Test the Anthropic API with the provided key"""
    api_key = "***REDACTED-ANTHROPIC-KEY***"
    
    # Anthropic API endpoint
    url = "https://api.anthropic.com/v1/messages"
    
    # Headers with API key
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    # Simple message request
    data = {
        "model": "claude-3-7-sonnet-20250219",
        "max_tokens": 100,
        "messages": [
            {"role": "user", "content": "Hello, Claude! Please respond with a short greeting."}
        ]
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("API key is valid and working!")
            return True
        else:
            print(f"API key validation failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error testing API key: {str(e)}")
        return False

if __name__ == "__main__":
    test_anthropic_api()