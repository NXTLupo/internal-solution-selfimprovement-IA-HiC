#!/usr/bin/env python3
"""
Test script to verify MulmoCast fixes
Tests script generation and processing with proper error handling
"""

import os
import sys
import requests
import json
import time
from pathlib import Path

MULMOCAST_URL = "http://localhost:5008"

def test_environment_setup():
    """Test that environment variables are properly configured"""
    print("🔧 Testing environment setup...")
    
    # Check if main .env has required keys
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    
    with open(env_file) as f:
        env_content = f.read()
    
    required_keys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "ELEVENLABS_API_KEY"]
    missing_keys = []
    
    for key in required_keys:
        if key not in env_content:
            missing_keys.append(key)
    
    if missing_keys:
        print(f"❌ Missing API keys: {missing_keys}")
        return False
    
    print("✅ Environment variables configured")
    return True

def test_service_health():
    """Test that MulmoCast service is healthy"""
    print("🏥 Testing service health...")
    
    try:
        response = requests.get(f"{MULMOCAST_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ MulmoCast service is healthy")
            return True
        else:
            print(f"❌ Service health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to MulmoCast service: {e}")
        print("💡 Make sure to start the service with: python internal-solutions-mulmocast/app.py")
        return False

def test_script_generation():
    """Test script generation with business template"""
    print("📝 Testing script generation...")
    
    try:
        # Test script generation
        payload = {
            "template": "business", 
            "prompt": "Create a short presentation about AI testing for development teams"
        }
        
        response = requests.post(
            f"{MULMOCAST_URL}/api/generate-script",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            script_id = data.get("script_id")
            print(f"✅ Script generated successfully: {script_id}")
            return script_id
        else:
            error_msg = response.text
            print(f"❌ Script generation failed: {response.status_code}")
            print(f"Error: {error_msg}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Script generation request failed: {e}")
        return None

def test_processing_with_safe_format(script_id, format_type):
    """Test multimedia processing with error handling"""
    print(f"🎬 Testing {format_type} generation...")
    
    try:
        # Start processing
        payload = {
            "script_id": script_id,
            "output_formats": [format_type],
            "language": "en"
        }
        
        response = requests.post(
            f"{MULMOCAST_URL}/api/process",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            job_id = data.get("job_id")
            print(f"✅ {format_type.title()} processing started: {job_id}")
            
            # Monitor job status
            max_attempts = 10
            for attempt in range(max_attempts):
                time.sleep(15)  # Wait between checks
                
                status_response = requests.get(f"{MULMOCAST_URL}/api/job/{job_id}", timeout=10)
                if status_response.status_code == 200:
                    job_data = status_response.json()
                    status = job_data.get("status")
                    progress = job_data.get("progress", 0)
                    current_step = job_data.get("current_step", "")
                    
                    print(f"📊 {format_type.title()} progress: {progress}% - {current_step}")
                    
                    if status == "completed":
                        output_files = job_data.get("output_files", [])
                        print(f"✅ {format_type.title()} generation completed!")
                        print(f"Generated files: {len(output_files)}")
                        return True
                    elif status == "failed":
                        error = job_data.get("error", "Unknown error")
                        print(f"❌ {format_type.title()} generation failed: {error}")
                        
                        # Check for specific error types
                        if "API key error" in error:
                            print("💡 This appears to be an API key configuration issue")
                        elif "organization must be verified" in error:
                            print("💡 This appears to be an OpenAI organization verification issue")
                        elif "gpt-image-1" in error:
                            print("💡 This appears to be a restricted model access issue")
                        
                        return False
                else:
                    print(f"❌ Status check failed: {status_response.status_code}")
                    return False
            
            print(f"⏰ {format_type.title()} generation timed out after {max_attempts * 15} seconds")
            return False
            
        else:
            error_msg = response.text
            print(f"❌ {format_type.title()} processing failed to start: {response.status_code}")
            print(f"Error: {error_msg}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ {format_type.title()} processing request failed: {e}")
        return False

def main():
    """Run comprehensive MulmoCast tests"""
    print("🚀 Starting MulmoCast Fix Verification Tests\n")
    
    # Test environment setup
    if not test_environment_setup():
        print("\n❌ Environment setup test failed")
        sys.exit(1)
    
    # Test service health
    if not test_service_health():
        print("\n❌ Service health test failed")
        sys.exit(1)
    
    # Test script generation
    script_id = test_script_generation()
    if not script_id:
        print("\n❌ Script generation test failed")
        sys.exit(1)
    
    print(f"\n📋 Testing multimedia generation with script: {script_id}")
    
    # Test each format - start with audio as it's simplest
    test_results = {}
    
    # Test audio generation (uses TTS)
    test_results["audio"] = test_processing_with_safe_format(script_id, "audio")
    
    # Test PDF generation (uses image generation)
    test_results["pdf"] = test_processing_with_safe_format(script_id, "pdf")
    
    # Test video generation (most complex, uses images + audio + assembly)
    test_results["video"] = test_processing_with_safe_format(script_id, "video")
    
    # Summary
    print("\n📊 Test Results Summary:")
    print("=" * 50)
    successful_tests = sum(test_results.values())
    total_tests = len(test_results)
    
    for format_type, success in test_results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{format_type.upper():<10} {status}")
    
    print("=" * 50)
    print(f"Overall: {successful_tests}/{total_tests} tests passed")
    
    if successful_tests == total_tests:
        print("🎉 All MulmoCast generation tests passed!")
        print("🔧 The fixes have successfully resolved the issues.")
    elif successful_tests > 0:
        print("⚠️ Some tests passed, but there are still issues to resolve.")
        print("💡 Check the error messages above for guidance.")
    else:
        print("❌ All tests failed. Please check the error messages above.")
        print("💡 Common issues:")
        print("  - API key configuration problems")
        print("  - Service not running")
        print("  - Network connectivity issues")
    
    print(f"\n🏁 Test completed. Script ID used: {script_id}")

if __name__ == "__main__":
    main()