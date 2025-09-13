#!/usr/bin/env python3
"""
Test script to verify Claude API is working in the LinkedIn generator.
"""

import os
import asyncio
import logging
from anthropic import Anthropic

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_claude_api():
    """Test Claude API directly."""
    try:
        # Check API key
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            logger.error("ANTHROPIC_API_KEY not found!")
            return False
        
        logger.info(f"API Key found (length: {len(api_key)})")
        
        # Initialize client
        client = Anthropic(api_key=api_key)
        
        # Test simple call
        logger.info("Making test Claude API call...")
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=100,
            temperature=0.3,
            messages=[{"role": "user", "content": "Say 'Claude API is working correctly!' and generate a short marketing message about AI."}]
        )
        
        result = response.content[0].text
        logger.info(f"Claude API test successful! Response: {result}")
        return True
        
    except Exception as e:
        logger.error(f"Claude API test failed: {str(e)}")
        return False

if __name__ == "__main__":
    # Test Claude API
    success = asyncio.run(test_claude_api())
    if success:
        print("✅ Claude API is working!")
    else:
        print("❌ Claude API test failed!")