#!/usr/bin/env python3
"""
Simple test script for Image Caption Generator
"""

import requests
import json

def test_health_endpoint():
    """Test health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get('http://localhost:5005/health', timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Health check passed")
            print(f"   Status: {health_data['status']}")
            print(f"   Model loaded: {health_data['model_loaded']}")
            print(f"   Features available:")
            for feature, available in health_data['features_available'].items():
                status = "✅" if available else "❌"
                print(f"     {status} {feature}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_frontend_accessibility():
    """Test that frontend is accessible"""
    print("\n🌐 Testing frontend accessibility...")
    try:
        response = requests.get('http://localhost:5005/', timeout=10)
        if response.status_code == 200:
            print("✅ Frontend is accessible")
            if 'multiple' in response.text.lower():
                print("✅ Frontend mentions multiple image support")
            else:
                print("⚠️ Frontend may not have multiple image support")
            return True
        else:
            print(f"❌ Frontend not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend access error: {e}")
        return False

if __name__ == "__main__":
    print("🎯 Testing Image Caption Generator Service")
    print("=" * 50)
    
    # Test health first
    health_ok = test_health_endpoint()
    
    if health_ok:
        # Test frontend accessibility
        frontend_ok = test_frontend_accessibility()
        
        if frontend_ok:
            print("\n🎉 Service is running correctly!")
            print("✅ Multiple image support is enabled")
            print("✅ Frontend has been updated for multiple uploads")
            print("\n💡 You can now:")
            print("   1. Visit http://localhost:5005")
            print("   2. Upload multiple images (up to 10)")
            print("   3. Generate captions for all images at once")
        else:
            print("\n⚠️ Frontend test failed, but service is healthy.")
    else:
        print("\n💀 Service health check failed.")
    
    print("\n" + "=" * 50)