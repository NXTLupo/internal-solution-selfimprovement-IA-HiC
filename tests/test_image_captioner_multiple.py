#!/usr/bin/env python3
"""
Test script for Image Caption Generator multiple image upload functionality
"""

import requests
import json
from PIL import Image
import numpy as np
import io

def create_test_image(width=224, height=224, color=(100, 150, 200)):
    """Create a simple test image"""
    img = Image.new('RGB', (width, height), color)
    # Add some simple patterns
    pixels = np.array(img)
    pixels[50:100, 50:100] = [255, 255, 255]  # White square
    pixels[150:200, 150:200] = [255, 0, 0]    # Red square
    return Image.fromarray(pixels)

def image_to_bytes(img, format='JPEG'):
    """Convert PIL image to bytes"""
    buf = io.BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()

def test_multiple_image_upload():
    """Test multiple image upload functionality"""
    print("🧪 Testing Image Caption Generator - Multiple Upload")
    
    # Create test images
    test_images = [
        ("test1.jpg", create_test_image(color=(255, 100, 100))),  # Red-ish
        ("test2.jpg", create_test_image(color=(100, 255, 100))),  # Green-ish
        ("test3.jpg", create_test_image(color=(100, 100, 255))),  # Blue-ish
    ]
    
    # Prepare files for upload
    files = []
    for filename, img in test_images:
        img_bytes = image_to_bytes(img)
        files.append(('files', (filename, img_bytes, 'image/jpeg')))
    
    try:
        print(f"📤 Uploading {len(test_images)} test images...")
        
        # Send request to caption endpoint
        response = requests.post(
            'http://localhost:5005/caption',
            files=files,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"📊 Processing summary:")
            print(f"   - Total images: {result['total_images']}")
            print(f"   - Processing time: {result['total_processing_time']:.2f}s")
            print(f"   - Timestamp: {result['timestamp']}")
            
            print(f"\n📝 Individual results:")
            for i, caption_result in enumerate(result['results'], 1):
                print(f"   {i}. {caption_result['filename']}:")
                print(f"      Caption: \"{caption_result['caption']}\"")
                print(f"      Confidence: {caption_result['confidence']*100:.1f}%")
                print(f"      Time: {caption_result['processing_time']:.2f}s")
            
            return True
            
        else:
            print(f"❌ Request failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Raw response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_health_endpoint():
    """Test health endpoint"""
    print("\n🏥 Testing health endpoint...")
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

if __name__ == "__main__":
    print("🎯 Testing Image Caption Generator Service")
    print("=" * 50)
    
    # Test health first
    health_ok = test_health_endpoint()
    
    if health_ok:
        # Test multiple image upload
        upload_ok = test_multiple_image_upload()
        
        if upload_ok:
            print("\n🎉 All tests passed! Multiple image upload is working correctly.")
        else:
            print("\n⚠️ Upload test failed, but service is healthy.")
    else:
        print("\n💀 Service health check failed. Cannot proceed with upload test.")
    
    print("\n" + "=" * 50)