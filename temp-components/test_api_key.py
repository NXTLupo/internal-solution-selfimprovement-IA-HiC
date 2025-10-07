#!/usr/bin/env python3
import requests
import os
import sys

def test_api_key(api_key):
    try:
        print(f"Testing API key: {api_key[:10]}...{api_key[-5:]}")
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "anthropic-version": "2023-06-01",
                "x-api-key": api_key,
                "Content-Type": "application/json"
            },
            json={
                "model": "claude-3-7-sonnet-20250219",
                "messages": [{"role": "user", "content": "Hello"}],
                "max_tokens": 10
            },
            timeout=10
        )
        
        print(f"Status code: {response.status_code}")
        if response.status_code == 200:
            print("API key is valid!")
            print("Response:", response.json().get("content", [{}])[0].get("text", ""))
            return True
        else:
            print("API key is invalid.")
            try:
                error = response.json().get("error", {})
                print(f"Error: {error.get('message', 'Unknown error')}")
            except:
                print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    # Try with the key you just provided
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    print("\nTesting your API key...")
    test_api_key(api_key)