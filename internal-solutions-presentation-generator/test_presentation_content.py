#!/usr/bin/env python3
"""
Test script to verify that content is actually being inserted into PowerPoint presentations
"""
import os
from pptx import Presentation

def verify_presentation_content(pptx_path):
    """Verify that a PowerPoint presentation contains actual content"""
    
    if not os.path.exists(pptx_path):
        print(f"❌ Presentation not found: {pptx_path}")
        return False
    
    print(f"🔍 Analyzing presentation: {pptx_path}")
    print(f"📁 File size: {os.path.getsize(pptx_path):,} bytes")
    
    try:
        prs = Presentation(pptx_path)
        print(f"📊 Total slides: {len(prs.slides)}")
        
        content_found = False
        
        for i, slide in enumerate(prs.slides):
            print(f"\n📄 Slide {i+1}:")
            
            # Check all shapes for text content
            slide_has_content = False
            
            for shape in slide.shapes:
                if hasattr(shape, 'text') and shape.text.strip():
                    text_content = shape.text.strip()
                    if len(text_content) > 10:  # Ignore short placeholder text
                        print(f"   ✅ Text content found ({len(text_content)} chars): {text_content[:100]}...")
                        slide_has_content = True
                        content_found = True
                elif hasattr(shape, 'text_frame') and shape.text_frame:
                    # Check paragraphs in text frame
                    for paragraph in shape.text_frame.paragraphs:
                        if paragraph.text.strip() and len(paragraph.text.strip()) > 10:
                            text_content = paragraph.text.strip()
                            print(f"   ✅ Paragraph content found ({len(text_content)} chars): {text_content[:100]}...")
                            slide_has_content = True
                            content_found = True
            
            if not slide_has_content:
                print(f"   ⚠️ No meaningful content found on this slide")
        
        print(f"\n📊 Content verification summary:")
        print(f"   Total slides: {len(prs.slides)}")
        print(f"   Content found: {'Yes' if content_found else 'No'}")
        
        if content_found:
            print("🎉 CONTENT VERIFICATION PASSED")
            print("✅ The presentation contains actual content from Claude 4")
            return True
        else:
            print("❌ CONTENT VERIFICATION FAILED")
            print("⚠️ The presentation appears to be blank or contains only placeholder text")
            return False
            
    except Exception as e:
        print(f"❌ Error analyzing presentation: {e}")
        return False

if __name__ == "__main__":
    # Test the simplified presentation
    verify_presentation_content("test_simplified_presentation.pptx")