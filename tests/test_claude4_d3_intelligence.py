#!/usr/bin/env python3
"""
Test Claude 4 → D3.js Intelligence Pipeline
Tests the enhanced system where Claude 4 dictates D3.js parameters
"""
import asyncio
import sys
import os

# Add the presentation generator path
sys.path.append('/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-presentation-generator')

from app import convert_data_to_d3_format, claude4_select_optimal_chart_type, claude4_optimize_visual_styling, generate_d3_infographic_with_claude4

async def test_claude4_d3_intelligence():
    """Test the complete Claude 4 → D3.js intelligence pipeline"""
    
    print("🧠 Testing Claude 4 → D3.js Intelligence Pipeline")
    print("=" * 60)
    
    # Test cases with different business contexts
    test_cases = [
        {
            "name": "Revenue Growth Analysis",
            "visual_spec": {
                "type": "growth_analysis",
                "title": "Q4 2024 Revenue Performance",
                "data": {
                    "categories": ["Q1", "Q2", "Q3", "Q4"],
                    "values": [2400000, 2800000, 3200000, 3600000],
                    "context": "quarterly revenue showing 50% YoY growth"
                }
            }
        },
        {
            "name": "Market Share Distribution", 
            "visual_spec": {
                "type": "market_analysis",
                "title": "2025 Market Share by Segment",
                "data": {
                    "segments": ["Enterprise", "Mid-Market", "SMB"],
                    "percentages": [45, 35, 20],
                    "context": "enterprise segment dominance with growth opportunity in SMB"
                }
            }
        },
        {
            "name": "Customer Journey Touchpoints",
            "visual_spec": {
                "type": "journey_mapping",
                "title": "Key Customer Touchpoints Analysis",
                "concept": {
                    "elements": [
                        {"name": "Awareness", "importance": 85, "satisfaction": 78},
                        {"name": "Consideration", "importance": 92, "satisfaction": 82},
                        {"name": "Purchase", "importance": 98, "satisfaction": 76},
                        {"name": "Support", "importance": 89, "satisfaction": 84},
                        {"name": "Retention", "importance": 95, "satisfaction": 88}
                    ]
                }
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🎯 Test {i}: {test_case['name']}")
        print("-" * 40)
        
        try:
            # Test the complete pipeline
            output_path = f"test_output/claude4_test_{i}.png"
            os.makedirs("test_output", exist_ok=True)
            
            success = await generate_d3_infographic_with_claude4(
                test_case['visual_spec'], 
                output_path
            )
            
            if success:
                print(f"✅ Successfully generated intelligent D3.js infographic")
                print(f"📁 Saved to: {output_path}")
                
                # Check if HTML file was also created
                html_path = output_path.replace('.png', '.html')
                if os.path.exists(html_path):
                    print(f"📄 HTML preview: {html_path}")
            else:
                print(f"❌ Failed to generate infographic")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n🎉 Claude 4 → D3.js intelligence testing complete!")
    print(f"📁 Check 'test_output' directory for generated infographics")

if __name__ == "__main__":
    asyncio.run(test_claude4_d3_intelligence())