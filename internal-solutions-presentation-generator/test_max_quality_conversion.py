#!/usr/bin/env python3
"""
Test Maximum Quality PNG Conversion
This script tests the ultra-high quality SVG-to-PNG conversion system.
"""

import os
import sys
from pathlib import Path

# Add current directory to path to import the conversion function
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import convert_svg_to_max_quality_png

def create_test_svg():
    """Create a test SVG with text and graphics to test quality conversion."""
    
    test_svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" style="background:transparent">
  <defs>
    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#01C4C8;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:0.8" />
    </linearGradient>
  </defs>
  
  <!-- Background shape -->
  <rect x="50" y="50" width="500" height="300" fill="url(#gradient1)" rx="20" opacity="0.8"/>
  
  <!-- Title text (test text rendering quality) -->
  <text x="300" y="120" text-anchor="middle" fill="white" font-family="SF Pro Display, Helvetica, Arial, sans-serif" 
        font-size="28" font-weight="700" text-rendering="geometricPrecision">Maximum Quality Test</text>
  
  <!-- Subtitle -->
  <text x="300" y="160" text-anchor="middle" fill="#CCCCCC" font-family="SF Pro Display, Helvetica, Arial, sans-serif" 
        font-size="16" font-weight="400" text-rendering="geometricPrecision">Testing ultra-high resolution SVG-to-PNG conversion</text>
  
  <!-- Test shapes for edge quality -->
  <circle cx="150" cy="250" r="40" fill="#22c55e" opacity="0.9"/>
  <rect x="220" y="210" width="80" height="80" fill="#ff6b6b" opacity="0.9" rx="8"/>
  <polygon points="350,210 390,250 370,290 330,290 310,250" fill="#4ecdc4" opacity="0.9"/>
  
  <!-- Small text to test readability -->
  <text x="300" y="320" text-anchor="middle" fill="white" font-family="SF Pro Display, Helvetica, Arial, sans-serif" 
        font-size="12" font-weight="400" text-rendering="geometricPrecision">Small text readability test at 12px</text>
  
  <!-- Very small text -->
  <text x="300" y="340" text-anchor="middle" fill="#CCCCCC" font-family="SF Pro Display, Helvetica, Arial, sans-serif" 
        font-size="8" font-weight="400" text-rendering="geometricPrecision">Tiny text at 8px - maximum quality conversion test</text>
</svg>'''
    
    test_svg_path = "test_svg_quality.svg"
    with open(test_svg_path, 'w', encoding='utf-8') as f:
        f.write(test_svg)
    
    return test_svg_path

def main():
    """Test the maximum quality conversion system."""
    
    print("🎯 Testing Maximum Quality SVG-to-PNG Conversion System")
    print("=" * 60)
    
    # Create test SVG
    print("📝 Creating test SVG with text and graphics...")
    test_svg_path = create_test_svg()
    
    if not os.path.exists(test_svg_path):
        print("❌ Failed to create test SVG")
        return False
    
    print(f"✅ Test SVG created: {test_svg_path}")
    
    # Test conversion
    test_png_path = test_svg_path.replace('.svg', '_max_quality.png')
    
    print(f"\n🔄 Converting to maximum quality PNG...")
    print(f"   Input:  {test_svg_path}")
    print(f"   Output: {test_png_path}")
    
    # Run the conversion
    success = convert_svg_to_max_quality_png(test_svg_path, test_png_path)
    
    if success and os.path.exists(test_png_path):
        file_size = os.path.getsize(test_png_path)
        print(f"\n✅ CONVERSION SUCCESSFUL!")
        print(f"   📁 PNG file created: {test_png_path}")
        print(f"   📊 File size: {file_size:,} bytes ({file_size/1024/1024:.1f} MB)")
        
        # Calculate expected quality improvement
        print(f"\n📈 QUALITY ANALYSIS:")
        print(f"   🎯 Target resolution: 7200×4800px (6x base)")
        print(f"   🎯 Target DPI: 1800 (6x standard)")
        print(f"   📊 Expected improvement: 36x pixel count vs standard")
        print(f"   ✨ Text should be crystal clear at all sizes")
        
        print(f"\n🖼️  VIEWING INSTRUCTIONS:")
        print(f"   Open {test_png_path} in an image viewer")
        print(f"   Zoom in to verify text clarity and edge sharpness")
        print(f"   Compare with standard resolution PNGs")
        
        return True
    else:
        print(f"\n❌ CONVERSION FAILED")
        print(f"   Check dependencies: cairosvg, playwright, wand, or inkscape")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)