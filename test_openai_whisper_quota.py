#!/usr/bin/env python3
"""
Test OpenAI Whisper API quota without breaking the video transcriber
"""

import os
import requests
from openai import OpenAI

def test_openai_whisper_quota():
    """Test OpenAI API key quota and billing status"""
    
    print("🎙️ Testing OpenAI Whisper API Quota...\n")
    
    # Get the API key used by video transcriber (from container environment)
    api_key = "***REDACTED-OPENAI-KEY***"
    
    print(f"🔑 API Key being used: {api_key[:20]}...{api_key[-10:]}")
    
    # Test 1: Check if API key is valid
    print("\n1. Testing API Key Validity...")
    try:
        client = OpenAI(api_key=api_key)
        
        # Try to list models (lightweight operation)
        models = client.models.list()
        print("✅ API Key is valid - can access OpenAI API")
        
        # Check if Whisper models are available
        whisper_models = [model for model in models.data if 'whisper' in model.id.lower()]
        if whisper_models:
            print(f"✅ Whisper models available: {[m.id for m in whisper_models]}")
        else:
            print("⚠️ No Whisper models found in available models")
            
    except Exception as e:
        print(f"❌ API Key validation failed: {e}")
        return False
    
    # Test 2: Test a minimal Whisper API call to check quota
    print("\n2. Testing Whisper API Quota...")
    try:
        # Create a minimal test audio file (0.1 seconds of silence)
        import tempfile
        import wave
        import numpy as np
        
        # Generate 0.1 seconds of silence at 16kHz
        sample_rate = 16000
        duration = 0.1
        samples = int(sample_rate * duration)
        audio_data = np.zeros(samples, dtype=np.int16)
        
        # Save as temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            with wave.open(temp_file.name, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.tobytes())
            
            temp_audio_path = temp_file.name
        
        # Test Whisper API with minimal audio
        with open(temp_audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"
            )
        
        print("✅ Whisper API call successful - quota is available")
        print(f"📝 Test transcription result: '{transcript.text}' (should be empty/minimal)")
        
        # Clean up temp file
        os.unlink(temp_audio_path)
        
        return True
        
    except Exception as e:
        error_str = str(e)
        print(f"❌ Whisper API call failed: {error_str}")
        
        if "insufficient_quota" in error_str or "429" in error_str:
            print("💳 QUOTA ISSUE: The API key has exceeded its usage limit or has no credits")
            print("   - Check billing at https://platform.openai.com/account/billing")
            print("   - Add credits or upgrade plan if needed")
            print("   - Consider using a different API key with available quota")
        elif "401" in error_str:
            print("🔐 AUTHENTICATION ISSUE: API key is invalid or expired")
        elif "403" in error_str:
            print("🚫 PERMISSION ISSUE: API key doesn't have access to Whisper API")
        else:
            print("🔍 OTHER ISSUE: Check the full error message above")
        
        return False

def check_video_transcriber_status():
    """Check if video transcriber service is running"""
    print("\n3. Checking Video Transcriber Service Status...")
    try:
        response = requests.get("http://localhost:5002/health", timeout=5)
        if response.status_code == 200:
            print("✅ Video Transcriber service is running")
            return True
        else:
            print(f"⚠️ Video Transcriber returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Video Transcriber service check failed: {e}")
        return False

def get_billing_info():
    """Get OpenAI billing information if possible"""
    print("\n4. Checking Billing Information...")
    api_key = "***REDACTED-OPENAI-KEY***"
    
    try:
        # Try to get billing information (this might not be available via API)
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Note: OpenAI doesn't provide direct billing API access anymore
        print("💡 Direct billing API access not available")
        print("   To check quota/billing:")
        print("   1. Visit https://platform.openai.com/account/billing")
        print("   2. Check 'Usage' and 'Billing' sections")
        print("   3. Verify credits and usage limits")
        
    except Exception as e:
        print(f"ℹ️ Billing info not accessible via API: {e}")

if __name__ == "__main__":
    print("🔍 OpenAI Whisper API Quota Diagnostic\n")
    print("=" * 50)
    
    # Run all tests
    api_works = test_openai_whisper_quota()
    service_works = check_video_transcriber_status()
    get_billing_info()
    
    print("\n" + "=" * 50)
    print("📊 DIAGNOSIS SUMMARY:")
    
    if api_works:
        print("✅ OpenAI Whisper API is working with current key")
        print("   The video transcriber should work normally")
    else:
        print("❌ OpenAI Whisper API has quota/billing issues")
        print("   RECOMMENDATION: Update API key or add credits")
        print("   TEMPORARY SOLUTION: Video transcriber will fall back to speech detection")
    
    if service_works:
        print("✅ Video Transcriber service is healthy")
    else:
        print("⚠️ Video Transcriber service may need restart")
    
    print("\nFor immediate fixes:")
    print("1. Check https://platform.openai.com/account/billing")
    print("2. Add credits or use a different API key")
    print("3. Update API key with: ./update_video_api_key.sh NEW_KEY")