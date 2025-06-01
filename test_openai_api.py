#!/usr/bin/env python3
"""
Test OpenAI API connectivity and authentication
"""
import os
import sys
import httpx
import asyncio
import json
from dotenv import load_dotenv

async def test_openai_api():
    """Test the OpenAI API connection"""
    # Load environment variables from .env file
    load_dotenv()
    
    # Get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return False
    
    # Clean the API key
    api_key = api_key.strip()
    if '\n' in api_key:
        print("Warning: API key contains newlines, cleaning...")
        api_key = api_key.split('\n')[0].strip()
    
    print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")
    
    # Test connection to OpenAI API
    url = "https://api.openai.com/v1/models"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    try:
        print("Testing connection to OpenAI API...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            
        if response.status_code == 200:
            models = response.json()
            print("\n✅ Connection successful!")
            print(f"Available models: {len(models['data'])}")
            
            # Check if Whisper is available
            whisper_models = [model for model in models['data'] if 'whisper' in model['id']]
            if whisper_models:
                print(f"✅ Whisper models available: {', '.join(m['id'] for m in whisper_models)}")
            else:
                print("❌ No Whisper models found in available models")
            
            return True
        else:
            print(f"❌ API request failed: {response.status_code} - {response.text}")
            return False
    
    except Exception as e:
        print(f"❌ Error connecting to OpenAI API: {str(e)}")
        return False

async def test_whisper_api():
    """Test the OpenAI Whisper API directly"""
    # Load environment variables from .env file
    load_dotenv()
    
    # Get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return False
    
    # Clean the API key
    api_key = api_key.strip()
    if '\n' in api_key:
        print("Warning: API key contains newlines, cleaning...")
        api_key = api_key.split('\n')[0].strip()
    
    # Check if a test audio file exists
    test_file = "test_audio.mp3"
    if not os.path.exists(test_file):
        print(f"Error: Test audio file not found: {test_file}")
        return False
    
    print(f"Testing OpenAI Whisper API with file: {test_file}")
    
    try:
        # Make direct request to OpenAI Whisper API
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        # Prepare form data
        form_data = {
            "model": "whisper-1",
            "response_format": "json"
        }
        
        # Send request
        async with httpx.AsyncClient(timeout=30.0) as client:
            with open(test_file, "rb") as audio_file:
                files = {"file": (os.path.basename(test_file), audio_file, "audio/mpeg")}
                response = await client.post(url, headers=headers, data=form_data, files=files)
        
        # Check response
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Whisper API request successful!")
            print(f"Transcription: {result.get('text', '')[:100]}...")
            return True
        else:
            print(f"❌ Whisper API request failed: {response.status_code} - {response.text}")
            return False
    
    except Exception as e:
        print(f"❌ Error using Whisper API: {str(e)}")
        return False

async def main():
    """Main function"""
    print("=== Testing OpenAI API Connection ===")
    api_success = await test_openai_api()
    
    if api_success:
        print("\n=== Testing OpenAI Whisper API ===")
        whisper_success = await test_whisper_api()
        
        if whisper_success:
            print("\n✅ All tests passed successfully!")
            return True
    
    print("\n❌ Some tests failed. Please check the errors above.")
    return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)