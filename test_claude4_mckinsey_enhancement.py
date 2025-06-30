#!/usr/bin/env python3
"""
Test script to verify Claude 4 Journey Mapper McKinsey-IDEO enhancement
"""

import sys
import os

# Add the path to our modules
sys.path.append('/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-claude4-journey-mapper-v2')

def test_enhanced_prompting():
    """Test that the enhanced McKinsey-IDEO prompting is active"""
    try:
        from ai_analysis.dynamic_journey_mapper import DynamicJourneyMapper
        
        # Initialize the mapper
        mapper = DynamicJourneyMapper()
        
        # Create test data
        test_data = {
            "title": "Test Customer Experience Journey",
            "description": "Testing McKinsey-IDEO enhanced analysis",
            "journey_type": "customer",
            "insights": {
                "stages": ["Awareness", "Consideration", "Purchase"],
                "pain_points": ["Slow response time", "Complex process"],
                "opportunities": ["Automation", "Personalization"]
            }
        }
        
        # Test first-pass prompt creation
        first_prompt = mapper._create_prompt(
            "Test Journey",
            "Test Description", 
            "customer",
            test_data,
            test_data["insights"]
        )
        
        # Check for McKinsey-IDEO keywords in first prompt
        mckinsey_keywords = [
            "McKinsey-level strategic consulting",
            "IDEO design thinking",
            "MECE framework",
            "Jobs-to-be-Done",
            "business impact quantification",
            "innovation opportunity matrix"
        ]
        
        first_pass_enhanced = all(keyword.lower() in first_prompt.lower() for keyword in mckinsey_keywords)
        
        # Test second-pass prompt creation (requires more parameters)
        mock_first_insights = {"stages": ["Test Stage"], "insights": ["Test Insight"]}
        second_prompt = mapper._create_second_pass_prompt(
            "Test Journey",
            "Test Description",
            "customer", 
            test_data,
            test_data["insights"],
            mock_first_insights,
            "<html>Mock HTML</html>"
        )
        
        # Check for enhanced McKinsey-IDEO keywords in second prompt
        enhanced_keywords = [
            "MANAGING PARTNER",
            "tier-1 management consulting",
            "strategic consulting masterpiece",
            "blue ocean strategy",
            "competitive moat analysis",
            "NPV analysis"
        ]
        
        second_pass_enhanced = all(keyword.lower() in second_prompt.lower() for keyword in enhanced_keywords)
        
        print("🔍 Claude 4 Journey Mapper McKinsey-IDEO Enhancement Test Results:")
        print("=" * 70)
        print(f"✅ First-pass prompt enhanced: {first_pass_enhanced}")
        print(f"✅ Second-pass prompt enhanced: {second_pass_enhanced}")
        print(f"✅ Using Claude 4 model: {mapper.anthropic_model}")
        print(f"✅ Maximum output tokens: {mapper.__class__.__dict__.get('CLAUDE_MAX_OUTPUT_TOKENS', 'Not found')}")
        
        if first_pass_enhanced and second_pass_enhanced:
            print("\n🎉 SUCCESS: McKinsey-IDEO enhancement is fully active!")
            print("   - Both prompts contain sophisticated consulting methodology")
            print("   - Strategic framework integration confirmed")
            print("   - Business impact quantification included")
            print("   - IDEO design thinking methodology integrated")
            return True
        else:
            print("\n⚠️ PARTIAL: Some enhancements may be missing")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    test_enhanced_prompting()