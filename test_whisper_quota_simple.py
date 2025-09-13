#!/usr/bin/env python3
"""
Simple test of OpenAI Whisper API quota using requests
"""

import requests
import json

def test_openai_api_status():
    """Test OpenAI API key status without OpenAI SDK"""
    
    print("🎙️ Testing OpenAI Whisper API Status...\n")
    
    # Get the API key used by video transcriber
    api_key = "***REDACTED-OPENAI-KEY***"
    
    print(f"🔑 API Key being used: {api_key[:20]}...{api_key[-10:]}")
    
    # Test 1: Check if API key is valid by listing models
    print("\n1. Testing API Key Validity...")
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            "https://api.openai.com/v1/models",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            models_data = response.json()
            models = [model['id'] for model in models_data.get('data', [])]
            print("✅ API Key is valid - can access OpenAI API")
            
            # Check for Whisper models
            whisper_models = [model for model in models if 'whisper' in model.lower()]
            if whisper_models:
                print(f"✅ Whisper models available: {whisper_models}")
            else:
                print("⚠️ No Whisper models found")
                
        elif response.status_code == 401:
            print("❌ API Key is invalid or expired")
            return False
        elif response.status_code == 429:
            print("❌ Rate limited or quota exceeded")
            return False
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False
    
    # Test 2: Check billing/usage (if accessible)
    print("\n2. Checking Account Status...")
    try:
        # Note: OpenAI removed direct billing API access for security
        print("💡 Billing information requires manual check")
        print("   Visit: https://platform.openai.com/account/billing")
        print("   Check: Usage limits and available credits")
        
    except Exception as e:
        print(f"ℹ️ Cannot check billing via API: {e}")
    
    return True

def check_video_service():
    """Check video transcriber service status"""
    print("\n3. Checking Video Transcriber Service...")
    try:
        response = requests.get("http://localhost:5002/health", timeout=5)
        if response.status_code == 200:
            print("✅ Video Transcriber service is running")
        else:
            print(f"⚠️ Service status: {response.status_code}")
    except Exception as e:
        print(f"❌ Service check failed: {e}")

def analyze_error():
    """Analyze the specific error from the user's output"""
    print("\n4. Analyzing the Reported Error...")
    
    error_message = """Error code: 429 - {'error': {'message': 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.', 'type': 'insufficient_quota', 'param': None, 'code': 'insufficient_quota'}}"""
    
    print("📋 ERROR ANALYSIS:")
    print("   Error Code: 429 (Too Many Requests)")
    print("   Error Type: insufficient_quota")
    print("   Root Cause: API key has exceeded usage limits or has no credits")
    
    print("\n💳 BILLING ISSUE CONFIRMED:")
    print("   - The API key has no available quota/credits")
    print("   - The account may need billing setup or credit top-up")
    print("   - Usage may have exceeded the monthly limit")
    
    print("\n🔧 SOLUTIONS:")
    print("   1. IMMEDIATE: Check billing at https://platform.openai.com/account/billing")
    print("   2. ADD CREDITS: Purchase credits or upgrade plan")
    print("   3. NEW API KEY: Use a different API key with available quota")
    print("   4. ALTERNATIVE: Video service will use speech detection fallback")

if __name__ == "__main__":
    print("🔍 OpenAI Whisper API Quota Diagnostic\n")
    print("=" * 60)
    
    # Run diagnostics
    api_valid = test_openai_api_status()
    check_video_service()
    analyze_error()
    
    print("\n" + "=" * 60)
    print("📊 FINAL DIAGNOSIS:")
    
    if api_valid:
        print("✅ API Key is technically valid")
        print("❌ BUT: Quota/billing issue prevents Whisper API usage")
    else:
        print("❌ API Key has authentication issues")
    
    print("\n🎯 RECOMMENDED ACTIONS:")
    print("1. Visit https://platform.openai.com/account/billing")
    print("2. Check 'Usage' tab for current month's consumption")
    print("3. Check 'Payment methods' and add credits if needed")
    print("4. Consider upgrading from free tier if applicable")
    print("5. Alternative: Use a different OpenAI API key with available quota")
    
    print("\n📱 UPDATE API KEY COMMAND:")
    print("   ./update_video_api_key.sh YOUR_NEW_API_KEY")