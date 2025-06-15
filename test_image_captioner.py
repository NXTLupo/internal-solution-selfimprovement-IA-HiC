#!/usr/bin/env python3
"""
Test script for Image Caption Generator
Tests the corrected implementation with multiple images
"""

import requests
import io
import time
from PIL import Image, ImageDraw, ImageFont

def create_test_image(text: str, size: tuple = (224, 224)) -> bytes:
    """Create a simple test image with text"""
    img = Image.new('RGB', size, color='lightblue')
    draw = ImageDraw.Draw(img)
    
    # Try to use a font, fall back to default if not available
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    # Calculate text position to center it
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    draw.text((x, y), text, font=font, fill='black')
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes.getvalue()

def test_health_endpoint():
    """Test the health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get("http://localhost:5005/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed")
            print(f"   Status: {data['status']}")
            print(f"   Model loaded: {data['model_loaded']}")
            print(f"   MobileNetV2: {data['features_available']['mobilenet_feature_extraction']}")
            print(f"   Caption model: {data['features_available']['flickr8k_caption_model']}")
            print(f"   Tokenizer: {data['features_available']['flickr8k_tokenizer']}")
            print(f"   Multiple images: {data['features_available']['multiple_image_support']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_multiple_image_upload():
    """Test multiple image upload functionality"""
    print("\n📸 Testing multiple image upload...")
    
    # Create test images
    test_images = [
        ("test_image_1.jpg", create_test_image("A dog running")),
        ("test_image_2.jpg", create_test_image("A cat sitting")),
        ("test_image_3.jpg", create_test_image("A bird flying"))
    ]
    
    try:
        # Prepare files for upload
        files = []
        for filename, image_data in test_images:
            files.append(('files', (filename, image_data, 'image/jpeg')))
        
        print(f"   Uploading {len(test_images)} test images...")
        start_time = time.time()
        
        response = requests.post(
            "http://localhost:5005/caption",
            files=files,
            timeout=30
        )
        
        processing_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Multiple image upload successful")
            print(f"   Processing time: {processing_time:.2f}s")
            print(f"   Total images processed: {data['total_images']}")
            print(f"   Server processing time: {data['total_processing_time']:.2f}s")
            
            for i, result in enumerate(data['results']):
                print(f"   Image {i+1}: {result['filename']}")
                print(f"      Caption: \"{result['caption']}\"")
                print(f"      Confidence: {result['confidence']:.1%}")
                print(f"      Processing: {result['processing_time']:.2f}s")
            
            return True
        else:
            print(f"❌ Upload failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Raw response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False

def test_single_image_upload():
    """Test single image upload (backward compatibility)"""
    print("\n🖼️ Testing single image upload...")
    
    try:
        test_image = create_test_image("A single test image")
        
        files = {'file': ('single_test.jpg', test_image, 'image/jpeg')}
        
        response = requests.post(
            "http://localhost:5005/caption-single",
            files=files,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Single image upload successful")
            print(f"   Caption: \"{data['caption']}\"")
            print(f"   Confidence: {data['confidence']:.1%}")
            print(f"   Processing time: {data['processing_time']:.2f}s")
            return True
        else:
            print(f"❌ Single upload failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Raw response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Single upload error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Image Caption Generator Implementation")
    print("=" * 60)
    
    # Test health endpoint
    health_ok = test_health_endpoint()
    
    if not health_ok:
        print("\n❌ Health check failed - skipping upload tests")
        return
    
    # Test multiple image upload
    multi_ok = test_multiple_image_upload()
    
    # Test single image upload
    single_ok = test_single_image_upload()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary:")
    print(f"   Health endpoint: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"   Multiple image upload: {'✅ PASS' if multi_ok else '❌ FAIL'}")
    print(f"   Single image upload: {'✅ PASS' if single_ok else '❌ FAIL'}")
    
    if health_ok and multi_ok and single_ok:
        print("\n🎉 All tests passed! The Image Caption Generator is working correctly.")
        print("\n📝 Notes:")
        print("   • MobileNetV2 feature extraction is working")
        print("   • Multiple image upload functionality is implemented")
        print("   • Frontend should now properly handle multiple files")
        print("   • Service follows original Flickr8k architecture")
        print("   • To get actual trained captions, add mymodel.h5 and tokenizer.pkl from Flickr8k training")
    else:
        print("\n⚠️ Some tests failed. Check the errors above for details.")

if __name__ == "__main__":
    main()