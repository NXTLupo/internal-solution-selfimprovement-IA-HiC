#!/usr/bin/env python3
"""
Debug Claude 4 content generation to see what structure it's actually returning
"""
import os
import sys
import asyncio
sys.path.append('.')

import anthropic
from dotenv import load_dotenv
load_dotenv()

async def test_claude_content_generation():
    """Test what Claude 4 is actually generating"""
    
    print("🧠 Testing Claude 4 content generation...")
    
    # Initialize Claude
    anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    # Test content (sample business data)
    test_content = """
    NXT Humans Q4 2024 Performance Analysis
    
    FINANCIAL PERFORMANCE:
    - Total Revenue: $3,247,892 (347% YoY increase) 
    - Gross Profit Margin: 73.8% (industry-leading)
    - Net Profit: $1,156,890 (35.6% margin)
    - Customer Lifetime Value: $34,580
    - Market Share: 0.37% with rapid growth trajectory
    
    STRATEGIC POSITIONING:
    - #3 position in enterprise AI CX solutions
    - 94.7% customer retention rate
    - Net Promoter Score: 78 (industry average: 34)
    - Win rate against competitors: 73%
    """
    
    # Simplified Claude prompt (avoiding complex f-string issues)
    claude_prompt = """I am an expert Market Researcher and Executive Storyteller. Analyze this business data and create a professional presentation structure.

Business Data:
""" + test_content + """

Return your analysis as valid JSON with this exact structure:

{
    "title": "Executive Presentation Title",
    "slides": [
        {
            "title": "Slide Title",
            "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
            "detailed_analysis": "Detailed paragraph analysis",
            "executive_takeaway": "Key takeaway summary"
        }
    ]
}

Generate 3-5 slides with proper bullet point arrays for PowerPoint."""
    
    print(f"📤 Sending prompt to Claude 4...")
    print(f"   Prompt length: {len(claude_prompt)} characters")
    
    try:
        claude_response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": claude_prompt}]
        )
        
        claude_analysis = claude_response.content[0].text
        print(f"📥 Claude response received: {len(claude_analysis)} characters")
        print(f"📄 Response preview: {claude_analysis[:500]}...")
        
        # Try to extract and parse JSON
        import re
        import json
        
        # Look for JSON block
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', claude_analysis, re.DOTALL)
        if json_match:
            json_content = json_match.group(1)
            print(f"✅ Found JSON block: {len(json_content)} characters")
        else:
            # Fallback to finding any JSON-like structure
            json_match = re.search(r'\{.*\}', claude_analysis, re.DOTALL)
            if json_match:
                json_content = json_match.group()
                print(f"⚠️ Found JSON without markers: {len(json_content)} characters")
            else:
                print(f"❌ No JSON found in response")
                return False
        
        # Parse the JSON
        try:
            claude_structure = json.loads(json_content)
            print(f"✅ Successfully parsed JSON structure")
            
            # Analyze the structure
            print(f"\n📊 Analysis Results:")
            print(f"   Title: {claude_structure.get('title', 'No title')}")
            print(f"   Number of slides: {len(claude_structure.get('slides', []))}")
            
            # Examine each slide's content structure
            for i, slide in enumerate(claude_structure.get('slides', []), 1):
                title = slide.get('title', 'No title')
                content = slide.get('content', [])
                detailed_analysis = slide.get('detailed_analysis', '')
                executive_takeaway = slide.get('executive_takeaway', '')
                
                print(f"\n   Slide {i}: '{title}'")
                print(f"      Content type: {type(content)}")
                
                if isinstance(content, list):
                    print(f"      Content items: {len(content)}")
                    for j, item in enumerate(content, 1):
                        print(f"         {j}. {item[:80]}{'...' if len(item) > 80 else ''}")
                else:
                    print(f"      ❌ Content is not a list! It's: {type(content)}")
                    print(f"      Content length: {len(str(content))} characters")
                    print(f"      Content preview: {str(content)[:100]}...")
                
                if detailed_analysis:
                    print(f"      Detailed analysis: {len(detailed_analysis)} characters")
                if executive_takeaway:
                    print(f"      Executive takeaway: {len(executive_takeaway)} characters")
            
            return True
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            print(f"   JSON content: {json_content[:200]}...")
            return False
            
    except Exception as e:
        print(f"❌ Claude request failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_claude_content_generation())
    if success:
        print(f"\n🎉 Claude content generation test PASSED")
        print(f"💡 Now we know exactly what structure Claude is returning")
    else:
        print(f"\n❌ Claude content generation test FAILED")
        print(f"🔧 Need to fix the Claude integration first")