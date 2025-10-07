#!/usr/bin/env python3
"""Simple OpenAI API test"""

import os
import requests

# Load API key from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

api_key = os.getenv('OPENAI_API_KEY')

if not api_key:
    print("ERROR: No OPENAI_API_KEY found in environment")
    exit(1)

print(f"Testing API key: {api_key[:15]}...{api_key[-10:]}")

# Test with simple API call
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

# Test models endpoint (simpler than chat completion)
response = requests.get('https://api.openai.com/v1/models', headers=headers)

print(f"Status Code: {response.status_code}")

if response.status_code == 200:
    print("SUCCESS: API key is working!")
    models = response.json()
    print(f"Available models: {len(models.get('data', []))}")
    
    # Check if whisper is available
    whisper_models = [m for m in models.get('data', []) if 'whisper' in m.get('id', '')]
    print(f"Whisper models available: {len(whisper_models)}")
    for model in whisper_models:
        print(f"  - {model.get('id')}")
        
elif response.status_code == 401:
    print("ERROR: Invalid API key (401 Unauthorized)")
    print(f"Response: {response.text}")
else:
    print(f"ERROR: API request failed with status {response.status_code}")
    print(f"Response: {response.text}")