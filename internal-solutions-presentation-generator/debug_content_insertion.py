#!/usr/bin/env python3
"""
Debug script to test content insertion into PowerPoint
This will help us understand why content is not appearing in slides
"""
import os
import sys
sys.path.append('.')

from pptx import Presentation
from pptx.util import Inches, Pt

def test_content_insertion():
    """Test the basic content insertion mechanism"""
    
    print("🔍 Testing PowerPoint content insertion...")
    
    # Load the template
    template_path = "templates/NXT_HUMANS_WORKING_TEMPLATE.pptx"
    if not os.path.exists(template_path):
        print(f"❌ Template not found: {template_path}")
        return False
    
    print(f"✅ Loading template: {template_path}")
    prs = Presentation(template_path)
    
    print(f"📊 Template info:")
    print(f"   Slide layouts available: {len(prs.slide_layouts)}")
    
    # Examine the slide layouts
    for i, layout in enumerate(prs.slide_layouts):
        print(f"   Layout {i}: '{layout.name}'")
        
        # Check placeholders in this layout
        placeholders = []
        for placeholder in layout.placeholders:
            placeholder_type = getattr(placeholder.placeholder_format, 'type', 'Unknown')
            placeholders.append(f"idx={placeholder.placeholder_format.idx}, type={placeholder_type}")
        
        print(f"      Placeholders: {placeholders}")
    
    # Create a test slide with real content
    print("\n🎯 Creating test slide with content...")
    
    # Use Layout 0 (as mentioned in logs)
    slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(slide_layout)
    
    print(f"📄 Added slide using layout: '{slide_layout.name}'")
    
    # Test content to insert
    test_content = [
        "Executive Summary: Q4 2024 Performance",
        "Revenue Growth: 347% YoY increase to $3.2M", 
        "Customer Retention: Industry-leading 94.7%",
        "Market Position: #3 in enterprise AI CX solutions"
    ]
    
    print(f"📝 Test content prepared: {len(test_content)} bullet points")
    
    # Try to insert content into available placeholders
    content_inserted = False
    
    for placeholder in slide.placeholders:
        placeholder_idx = placeholder.placeholder_format.idx
        placeholder_type = getattr(placeholder.placeholder_format, 'type', None)
        
        print(f"   Placeholder {placeholder_idx}: type={placeholder_type}")
        
        if hasattr(placeholder, 'text_frame') and placeholder.text_frame is not None:
            if placeholder_type == 1:  # Title
                placeholder.text = "NXT Humans Q4 2024 Strategic Review"
                print(f"   ✅ Set title in placeholder {placeholder_idx}")
            elif placeholder_type in [2, 7]:  # Body or Object
                print(f"   🎯 Inserting content into placeholder {placeholder_idx}")
                
                text_frame = placeholder.text_frame
                text_frame.clear()
                
                for i, point in enumerate(test_content):
                    if i == 0:
                        p = text_frame.paragraphs[0]
                        p.text = point
                    else:
                        p = text_frame.add_paragraph()
                        p.text = point
                    
                    p.font.size = Pt(16)
                    p.level = 0
                
                content_inserted = True
                print(f"   ✅ Inserted {len(test_content)} bullet points")
                break
    
    if not content_inserted:
        print("   ❌ Could not find suitable placeholder for content")
        return False
    
    # Save the test presentation
    output_path = "debug_test_content.pptx"
    prs.save(output_path)
    file_size = os.path.getsize(output_path)
    
    print(f"\n💾 Test presentation saved: {output_path}")
    print(f"📁 File size: {file_size:,} bytes")
    
    if file_size > 30000:  # Should be larger than empty template
        print("✅ File size suggests content was actually inserted")
        return True
    else:
        print("❌ File size too small - content may not have been inserted")
        return False

if __name__ == "__main__":
    success = test_content_insertion()
    if success:
        print("\n🎉 Content insertion test PASSED")
        print("💡 The basic PowerPoint insertion mechanism works")
        print("🔍 The issue must be in how Claude's content is being processed")
    else:
        print("\n❌ Content insertion test FAILED") 
        print("🔧 The PowerPoint insertion mechanism itself is broken")