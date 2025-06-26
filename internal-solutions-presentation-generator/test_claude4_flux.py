#!/usr/bin/env python3
"""
Test script to verify Claude 4 Extended Thinking + FLUX integration
"""
import asyncio
import sys
import os
sys.path.append('.')

from app import analyze_content_with_ai, generate_flux_image, create_infographic_content

async def test_claude4_analysis():
    """Test Claude 4 extended thinking analysis"""
    print("🧠 Testing Claude 4 Extended Thinking Analysis...")
    
    # Sample data-rich content
    test_content = """
    Sales Performance Q4 2024
    
    Our sales team achieved remarkable results in Q4:
    - Total revenue: $2.5M (up 35% from Q3)
    - New customers acquired: 1,240 (highest quarter ever)
    - Customer satisfaction: 94% (up from 89% in Q3)
    - Average deal size: $15,000 (20% increase)
    - Sales cycle: 45 days (reduced from 60 days)
    - Team productivity: 125% of target
    
    Regional Performance:
    - North America: $1.2M (48% of total)
    - Europe: $800K (32% of total)
    - Asia-Pacific: $500K (20% of total)
    
    Top Products:
    1. Enterprise Suite: $1.5M revenue, 150 units sold
    2. Professional Pack: $700K revenue, 350 units sold
    3. Starter Kit: $300K revenue, 890 units sold
    
    Key Challenges:
    - Supply chain delays affected 15% of orders
    - Competition increased in the mid-market segment
    - Need to improve onboarding process (current: 2 weeks)
    
    2025 Targets:
    - Revenue goal: $12M (140% growth)
    - Customer acquisition: 5,000 new customers
    - Market expansion: 3 new regions
    """
    
    # Test Claude 4 analysis
    try:
        result = await analyze_content_with_ai(test_content, "Q4_Sales_Report.txt")
        
        print(f"\n✅ Analysis Results:")
        print(f"   📊 Success: {result['success']}")
        print(f"   📋 Title: {result['structure']['title']}")
        print(f"   🎨 Theme: {result.get('visual_theme', 'N/A')}")
        print(f"   📈 Data insights: {len(result.get('infographic_data', []))}")
        print(f"   📄 Slides: {len(result['structure']['slides'])}")
        
        # Check for enhanced features
        for i, slide in enumerate(result['structure']['slides']):
            layout_type = slide.get('layout_type', 'unknown')
            infographic_type = slide.get('infographic_type', 'none')
            has_data = slide.get('has_data', False)
            
            print(f"   Slide {i+1}: {layout_type} | {infographic_type} | Data: {has_data}")
            
        return result
        
    except Exception as e:
        print(f"❌ Claude 4 analysis failed: {e}")
        return None

async def test_flux_generation():
    """Test FLUX image generation"""
    print("\n🎨 Testing FLUX Image Generation...")
    
    test_prompts = [
        "Professional bar chart showing Q4 sales performance data",
        "Modern pie chart displaying regional revenue distribution",
        "Clean timeline infographic for project milestones"
    ]
    
    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n🖼️ Test {i}: {prompt}")
        try:
            image_data = await generate_flux_image(prompt, "16:9")
            if image_data:
                print(f"   ✅ Generated image: {len(image_data)} bytes")
                
                # Save test image
                test_path = f"generated_content/test_flux_{i}.png"
                with open(test_path, 'wb') as f:
                    f.write(image_data)
                print(f"   💾 Saved to: {test_path}")
            else:
                print(f"   ❌ Failed to generate image")
        except Exception as e:
            print(f"   ❌ Error: {e}")

async def test_infographic_integration():
    """Test complete infographic creation workflow"""
    print("\n🔄 Testing Complete Infographic Workflow...")
    
    # Sample slide data
    slide_data = {
        'title': 'Q4 Revenue Performance',
        'content': ['Total revenue: $2.5M', 'Growth: 35% from Q3', 'Top region: North America'],
        'layout_type': 'infographic',
        'infographic_type': 'bar_chart',
        'needs_images': True,
        'has_data': True,
        'data_points': ['$2.5M total', '35% growth', '48% North America']
    }
    
    try:
        result = await create_infographic_content(slide_data, "Professional Blue Theme")
        
        print(f"   📊 Has custom image: {result['has_custom_image']}")
        print(f"   🎨 Chart type: {result['chart_type']}")
        print(f"   📝 Enhanced content: {len(result['enhanced_content'])} points")
        
        if result['image_data']:
            print(f"   🖼️ Image size: {len(result['image_data'])} bytes")
            
            # Save test infographic
            test_path = "generated_content/test_infographic_complete.png"
            with open(test_path, 'wb') as f:
                f.write(result['image_data'])
            print(f"   💾 Saved infographic to: {test_path}")
            
        return result
        
    except Exception as e:
        print(f"   ❌ Infographic workflow failed: {e}")
        return None

async def main():
    """Run all tests"""
    print("🧪 Testing Claude 4 + FLUX Integration")
    print("=" * 50)
    
    # Check environment
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    replicate_key = os.getenv("REPLICATE_API_TOKEN")
    
    print(f"🔑 ANTHROPIC_API_KEY: {'✅ Set' if anthropic_key else '❌ Missing'}")
    print(f"🔑 REPLICATE_API_TOKEN: {'✅ Set' if replicate_key else '❌ Missing'}")
    
    if not anthropic_key:
        print("❌ Cannot test Claude 4 without ANTHROPIC_API_KEY")
        return
    
    # Run tests
    try:
        # Test 1: Claude 4 Analysis
        analysis_result = await test_claude4_analysis()
        
        # Test 2: FLUX Generation (only if API key available)
        if replicate_key:
            await test_flux_generation()
        else:
            print("\n⚠️ Skipping FLUX tests - REPLICATE_API_TOKEN not set")
        
        # Test 3: Complete workflow (only if both APIs available)
        if replicate_key and analysis_result:
            await test_infographic_integration()
        
        print("\n🎉 Testing completed!")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())