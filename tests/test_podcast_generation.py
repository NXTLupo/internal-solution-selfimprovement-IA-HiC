#!/usr/bin/env python3
"""
Test the fixed podcast generation workflow
"""
import asyncio
import sys
import os
import uuid

# Add the LinkedIn generator path
sys.path.append('/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-linkedin-generator')

from app import generate_podcast_from_content

async def test_podcast_generation():
    """Test the complete podcast generation workflow"""
    
    print("🎙️ Testing Podcast Generation with Fixed Mulmocast Integration")
    print("=" * 60)
    
    # Test content
    test_content = """
    The future of customer experience lies in AI-powered personalization at scale. 
    Companies that embrace this transformation see 40% higher satisfaction and 25% increased revenue.
    
    Key insights:
    - 78% of customers expect AI-driven personalized experiences
    - Omnichannel integration is now table stakes, not a differentiator
    - Real-time journey adaptation based on behavior is essential
    
    Organizations that implement these strategies will thrive in the customer-centric marketplace of 2025.
    """
    
    # Generate unique session ID
    session_id = str(uuid.uuid4())[:8]
    
    print(f"📝 Test Content: {len(test_content)} characters")
    print(f"🔑 Session ID: {session_id}")
    print(f"🎯 Testing Mulmocast integration...")
    
    try:
        # Test podcast generation
        result = await generate_podcast_from_content(test_content, session_id)
        
        if result and result.get("success"):
            print(f"✅ Podcast generated successfully!")
            print(f"🎵 Audio file: {result.get('audio_file')}")
            print(f"📁 Audio path: {result.get('audio_path')}")
            print(f"📥 Download URL: {result.get('download_url')}")
            print(f"🎧 Preview URL: {result.get('preview_url')}")
            print(f"📏 File size: {result.get('file_size')} bytes")
            print(f"⏱️ Duration: {result.get('duration_estimate', 'Unknown')}")
        else:
            print(f"❌ Podcast generation failed")
            if result:
                print(f"🔍 Result: {result}")
            
    except Exception as e:
        print(f"❌ Error during podcast generation: {e}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_podcast_generation())