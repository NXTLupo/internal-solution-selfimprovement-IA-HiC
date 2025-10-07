#!/usr/bin/env python3
"""
Test the OpenAI Whisper API key
"""
import os
import sys
import httpx
import asyncio
import json

# Hard-coded API key for testing
API_KEY = "***REDACTED-OPENAI-KEY***"

async def test_openai_api():
    """Test the OpenAI API connection"""
    # Set the API key in the environment
    os.environ["OPENAI_API_KEY"] = API_KEY
    
    # Test connection to OpenAI API
    url = "https://api.openai.com/v1/models"
    headers = {
        "Authorization": f"Bearer {API_KEY}"
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
    # Set the API key in the environment
    os.environ["OPENAI_API_KEY"] = API_KEY
    
    # Check if a test audio file exists
    test_file = "test_audio.mp3"
    if not os.path.exists(test_file):
        print(f"Creating test audio file: {test_file}")
        try:
            # Create a silent 3-second audio file
            import subprocess
            subprocess.run([
                "ffmpeg", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", 
                "-t", "3", "-q:a", "9", "-acodec", "libmp3lame", 
                test_file, "-y", "-loglevel", "error"
            ], check=True)
            print(f"Created test audio file: {test_file}")
        except Exception as e:
            print(f"Error creating test audio file: {str(e)}")
            return False
    
    print(f"Testing OpenAI Whisper API with file: {test_file}")
    
    try:
        # Make direct request to OpenAI Whisper API
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {API_KEY}"
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