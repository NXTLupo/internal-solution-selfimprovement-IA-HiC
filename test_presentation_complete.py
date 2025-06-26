#!/usr/bin/env python3
"""
Complete test script for presentation generation workflow
"""
import requests
import json
import time

BASE_URL = "http://localhost:3002"

def test_outline_generation():
    """Test the presentation outline generation endpoint"""
    
    test_data = {
        "prompt": "Digital Marketing Strategies for Small Business",
        "numberOfCards": 4,
        "language": "English",
        "model": "gpt-4o"
    }
    
    print("🔍 Testing outline generation...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/presentation/outline",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        if response.status_code == 200:
            print("✅ Outline generation successful!")
            return response.text
        else:
            print(f"❌ Outline generation failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Outline generation error: {e}")
        return None

def test_presentation_creation(outline_content):
    """Test creating a presentation with the generated outline"""
    
    # Parse the streaming response format and extract headings
    # The response comes in format: 0:"#" 0:" Topic" 0:" Name" etc.
    clean_content = ""
    for line in outline_content.split('\n'):
        if line.startswith('0:"') and line.endswith('"'):
            clean_content += line[3:-1]  # Remove 0:" and trailing "
    
    # Now parse the clean content for headings
    outline_lines = clean_content.split('#')
    outline_topics = []
    
    for line in outline_lines:
        if line.strip():
            # Take only the heading part (before the first bullet point)
            topic = line.split('-')[0].strip()
            if topic and not topic.startswith(' '):
                outline_topics.append(topic)
    
    test_data = {
        "title": "Digital Marketing Strategies for Small Business",
        "theme": "nxtHumans",
        "outline": outline_topics,
        "imageModel": "flux-1.1-pro",
        "presentationStyle": "professional",
        "language": "English"
    }
    
    print("🏗️ Testing presentation creation...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/presentation/create",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Presentation creation successful!")
            result = response.json()
            return result.get('id')
        else:
            print(f"❌ Presentation creation failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Presentation creation error: {e}")
        return None

def test_presentation_generation(presentation_id, outline_content):
    """Test generating slides for the presentation"""
    
    # Parse the streaming response format and extract headings
    # The response comes in format: 0:"#" 0:" Topic" 0:" Name" etc.
    clean_content = ""
    for line in outline_content.split('\n'):
        if line.startswith('0:"') and line.endswith('"'):
            clean_content += line[3:-1]  # Remove 0:" and trailing "
    
    # Now parse the clean content for headings
    outline_lines = clean_content.split('#')
    outline_topics = []
    
    for line in outline_lines:
        if line.strip():
            # Take only the heading part (before the first bullet point)
            topic = line.split('-')[0].strip()
            if topic and not topic.startswith(' '):
                outline_topics.append(topic)
    
    test_data = {
        "title": "Digital Marketing Strategies for Small Business",
        "outline": outline_topics,
        "language": "English",
        "tone": "professional",
        "model": "gpt-4o"
    }
    
    print("🎨 Testing presentation slide generation...")
    print(f"📋 Outline topics: {outline_topics}")
    print(f"📊 Number of topics: {len(outline_topics)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/presentation/generate",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=120
        )
        
        if response.status_code == 200:
            print("✅ Presentation generation successful!")
            print("📄 Generated slides content:")
            print(response.text[:500] + "..." if len(response.text) > 500 else response.text)
            return True
        else:
            print(f"❌ Presentation generation failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Presentation generation error: {e}")
        return False

def main():
    """Run the complete presentation generation test"""
    print("🚀 Testing Complete Presentation Generator Workflow")
    print("=" * 60)
    
    # Test service health
    try:
        response = requests.get(f"{BASE_URL}", timeout=5)
        print(f"✅ Service is running (status: {response.status_code})")
    except Exception as e:
        print(f"❌ Service not accessible: {e}")
        return
    
    print()
    
    # Step 1: Generate outline
    outline = test_outline_generation()
    if not outline:
        print("❌ Cannot proceed without outline")
        return
    
    print()
    
    # Step 2: Create presentation
    presentation_id = test_presentation_creation(outline)
    if not presentation_id:
        print("❌ Cannot proceed without presentation ID")
        return
    
    print(f"📄 Created presentation with ID: {presentation_id}")
    print()
    
    # Step 3: Generate slides
    success = test_presentation_generation(presentation_id, outline)
    
    if success:
        print("\n🎉 Complete presentation workflow test PASSED!")
        print(f"🌐 Access your presentation at: {BASE_URL}/presentation/{presentation_id}")
    else:
        print("\n❌ Complete presentation workflow test FAILED!")

if __name__ == "__main__":
    main()