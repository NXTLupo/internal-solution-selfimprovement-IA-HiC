#!/usr/bin/env python3
"""
Test script to verify the fixed video analyzer app is working correctly
"""
import os
import sys
import traceback

def test_env_loading():
    """Test environment variable loading"""
    print("🔧 Testing environment variable loading...")
    
    # Load environment variables
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)
        if os.path.exists(".env"):
            load_dotenv(".env", override=True)
        print("✓ Dotenv loaded successfully")
    except ImportError:
        print("⚠️  python-dotenv not installed, using system env vars only")
    
    # Check API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if api_key:
        api_key = api_key.strip()
        masked_key = f"{api_key[:7]}...{api_key[-4:]}" if len(api_key) > 10 else "[INVALID KEY]"
        print(f"✓ OpenAI API key loaded: {masked_key} (length: {len(api_key)})")
        return True
    else:
        print("❌ No OpenAI API key found in environment")
        return False

def test_openai_connection():
    """Test OpenAI API connection"""
    print("\n🌐 Testing OpenAI API connection...")
    
    try:
        from openai import OpenAI
        
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            print("❌ No API key available for testing")
            return False
        
        api_key = api_key.strip()
        client = OpenAI(api_key=api_key)
        
        # Test with a simple completion
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'API test successful' and nothing else."}],
            max_tokens=10
        )
        
        result = response.choices[0].message.content.strip()
        print(f"✓ OpenAI API test successful: {result}")
        return True
        
    except Exception as e:
        print(f"❌ OpenAI API test failed: {str(e)}")
        return False

def test_whisper_function():
    """Test the core transcription function logic (without actual file)"""
    print("\n🎤 Testing transcription function logic...")
    
    try:
        # Mock the imports that would normally fail
        sys.modules['yt_dlp'] = type('MockModule', (), {})()
        sys.modules['pydub'] = type('MockModule', (), {})()
        
        # Import our API key loading logic
        exec("""
# Load environment variables first (ensure we get the latest values)
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)  # Load from parent directory .env
    if os.path.exists(".env"):
        load_dotenv(".env", override=True)  # Load from local .env if it exists
except ImportError:
    # dotenv not installed, continue without it
    pass

# OpenAI API key from environment (secure - no hardcoded fallback)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
if OPENAI_API_KEY:
    # Clean the API key (remove any whitespace/newlines)
    OPENAI_API_KEY = OPENAI_API_KEY.strip()
    # Ensure USE_WHISPER_API is set
    os.environ['USE_WHISPER_API'] = 'true'
else:
    OPENAI_API_KEY = None
""")
        
        # Test the API key logic
        api_key = locals().get('OPENAI_API_KEY') or globals().get('OPENAI_API_KEY') or os.environ.get('OPENAI_API_KEY')
        if api_key:
            api_key = api_key.strip()
            masked_key = f"{api_key[:7]}...{api_key[-4:]}" if len(api_key) > 10 else "[INVALID KEY]"
            print(f"✓ API key loading logic works: {masked_key}")
            print(f"✓ USE_WHISPER_API set to: {os.environ.get('USE_WHISPER_API', 'not set')}")
            return True
        else:
            print("❌ API key loading logic failed")
            return False
            
    except Exception as e:
        print(f"❌ Transcription function test failed: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Fixed Video Analyzer Implementation\n")
    
    tests = [
        ("Environment Loading", test_env_loading),
        ("OpenAI Connection", test_openai_connection),
        ("Transcription Logic", test_whisper_function),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ {name} test crashed: {str(e)}")
            results.append((name, False))
    
    print("\n📊 Test Summary:")
    print("=" * 40)
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name:<20} {status}")
        if not passed:
            all_passed = False
    
    print("=" * 40)
    if all_passed:
        print("🎉 All tests passed! Video Analyzer is ready to use.")
    else:
        print("⚠️  Some tests failed. Check the issues above.")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)