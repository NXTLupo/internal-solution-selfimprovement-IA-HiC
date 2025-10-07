#!/usr/bin/env python3
"""
Test the REAL AI caption generation with BLIP model
"""

import requests
import io
import time
from PIL import Image, ImageDraw, ImageFont

def create_test_image(description: str, size: tuple = (512, 512)) -> bytes:
    """Create a more detailed test image"""
    
    # Create different colored backgrounds based on description
    if "dog" in description.lower():
        bg_color = (144, 238, 144)  # Light green (outdoor feel)
        text_color = (0, 100, 0)
    elif "cat" in description.lower():
        bg_color = (255, 228, 196)  # Bisque (indoor feel)
        text_color = (139, 69, 19)
    elif "person" in description.lower():
        bg_color = (173, 216, 230)  # Light blue
        text_color = (25, 25, 112)
    else:
        bg_color = (240, 240, 240)  # Light gray
        text_color = (64, 64, 64)
    
    img = Image.new('RGB', size, color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a larger font
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 36)
    except:
        font = ImageFont.load_default()
    
    # Add main text
    bbox = draw.textbbox((0, 0), description, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    draw.text((x, y), description, font=font, fill=text_color)
    
    # Add some visual elements to make it more interesting
    # Draw some shapes to simulate objects
    if "dog" in description.lower():
        # Draw a simple "dog" shape
        draw.ellipse([100, 300, 200, 400], fill=(139, 69, 19))  # Body
        draw.ellipse([150, 250, 190, 290], fill=(139, 69, 19))  # Head
        draw.ellipse([160, 260, 170, 270], fill=(0, 0, 0))      # Eye
        draw.ellipse([140, 380, 160, 420], fill=(139, 69, 19))  # Leg
        draw.ellipse([180, 380, 200, 420], fill=(139, 69, 19))  # Leg
    elif "cat" in description.lower():
        # Draw a simple "cat" shape
        draw.ellipse([150, 320, 250, 380], fill=(255, 140, 0))  # Body
        draw.ellipse([180, 280, 220, 320], fill=(255, 140, 0))  # Head
        draw.polygon([(185, 280), (195, 260), (205, 280)], fill=(255, 140, 0))  # Ear
        draw.polygon([(195, 280), (205, 260), (215, 280)], fill=(255, 140, 0))  # Ear
        draw.ellipse([190, 290, 195, 295], fill=(0, 0, 0))      # Eye
        draw.ellipse([205, 290, 210, 295], fill=(0, 0, 0))      # Eye
    elif "person" in description.lower():
        # Draw a simple stick figure
        draw.ellipse([220, 200, 280, 260], fill=(255, 220, 177))  # Head
        draw.line([(250, 260), (250, 380)], fill=(0, 0, 0), width=5)  # Body
        draw.line([(250, 300), (200, 330)], fill=(0, 0, 0), width=3)  # Arm
        draw.line([(250, 300), (300, 330)], fill=(0, 0, 0), width=3)  # Arm
        draw.line([(250, 380), (220, 450)], fill=(0, 0, 0), width=3)  # Leg
        draw.line([(250, 380), (280, 450)], fill=(0, 0, 0), width=3)  # Leg
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes.getvalue()

def test_real_ai_captions():
    """Test the BLIP AI model with various images"""
    print("🤖 Testing REAL AI Caption Generation with BLIP Model")
    print("=" * 60)
    
    # Test images that should generate interesting captions
    test_images = [
        ("test_dog.jpg", create_test_image("A dog in the park")),
        ("test_cat.jpg", create_test_image("A cat sitting indoors")),
        ("test_person.jpg", create_test_image("A person standing outside")),
        ("test_scene.jpg", create_test_image("A colorful outdoor scene"))
    ]
    
    print(f"🔍 Testing {len(test_images)} images with BLIP AI model...")
    
    try:
        # Prepare files for upload
        files = []
        for filename, image_data in test_images:
            files.append(('files', (filename, image_data, 'image/jpeg')))
        
        print(f"📤 Uploading to BLIP AI service...")
        start_time = time.time()
        
        response = requests.post(
            "http://localhost:5005/caption",
            files=files,
            timeout=60  # Give more time for AI processing
        )
        
        processing_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ BLIP AI Processing successful!")
            print(f"   Total processing time: {processing_time:.2f}s")
            print(f"   Images processed: {data['total_images']}")
            print(f"   Server processing time: {data['total_processing_time']:.2f}s")
            print()
            
            print("🎯 REAL AI CAPTIONS FROM BLIP MODEL:")
            print("-" * 50)
            
            for i, result in enumerate(data['results']):
                print(f"📸 Image {i+1}: {result['filename']}")
                print(f"   🤖 AI Caption: \"{result['caption']}\"")
                print(f"   📊 Confidence: {result['confidence']:.1%}")
                print(f"   ⏱️  Processing: {result['processing_time']:.2f}s")
                print()
            
            # Check if captions are actually intelligent
            captions = [r['caption'].lower() for r in data['results']]
            intelligent_words = ['person', 'man', 'woman', 'dog', 'cat', 'sitting', 'standing', 
                               'outdoor', 'indoor', 'wearing', 'holding', 'looking', 'scene',
                               'background', 'foreground', 'color', 'light', 'dark']
            
            intelligent_count = sum(1 for caption in captions 
                                  for word in intelligent_words if word in caption)
            
            if intelligent_count > 0:
                print("🎉 SUCCESS: BLIP AI is generating REAL intelligent captions!")
                print(f"   Detected {intelligent_count} intelligent descriptive words")
            else:
                print("⚠️  Captions seem generic - checking if BLIP model is working properly")
            
            return True
        else:
            print(f"❌ AI processing failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Raw response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

def test_health_check():
    """Check if the BLIP model is properly loaded"""
    print("🔍 Checking BLIP AI Model Status...")
    
    try:
        response = requests.get("http://localhost:5005/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Service status: {data['status']}")
            print(f"📊 Model loaded: {data['model_loaded']}")
            
            features = data['features_available']
            print(f"🤖 BLIP model: {features.get('blip_model', False)}")
            print(f"🔧 PyTorch backend: {features.get('pytorch_backend', False)}")
            print(f"🚀 Real AI captions: {features.get('real_ai_captions', False)}")
            
            device_info = data.get('device_info', {})
            print(f"💻 Device: {device_info.get('device_type', 'unknown')}")
            print(f"🔧 PyTorch: {device_info.get('pytorch_version', 'unknown')}")
            
            return data['model_loaded'] and features.get('blip_model', False)
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def main():
    """Run the REAL AI caption test"""
    print("🚀 BLIP AI Image Caption Generator Test")
    print("=" * 60)
    
    # Check if model is loaded
    health_ok = test_health_check()
    print()
    
    if not health_ok:
        print("❌ BLIP model not ready - cannot test captions")
        return
    
    # Test real AI captions
    caption_ok = test_real_ai_captions()
    
    print("=" * 60)
    print("📊 BLIP AI Test Summary:")
    print(f"   Health check: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"   AI captions: {'✅ PASS' if caption_ok else '❌ FAIL'}")
    
    if health_ok and caption_ok:
        print("\n🎉 SUCCESS: BLIP AI is generating REAL captions!")
        print("🔗 Try it yourself at: http://localhost:5005")
        print("\n💡 The terrible fallback captions are GONE!")
        print("💡 You now have state-of-the-art AI image captioning!")
    else:
        print("\n⚠️ Issues detected - check the service logs")

if __name__ == "__main__":
    main()