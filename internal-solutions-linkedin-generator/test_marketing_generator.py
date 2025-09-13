#!/usr/bin/env python3
"""
Test the marketing content generator directly.
"""

import os
import asyncio
import logging
from src.marketing_content_generator import create_marketing_generator, MarketingConfig, MarketingObjective, TargetAudience, ContentTone
from src.universal_content_parser import create_universal_parser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_marketing_generator():
    """Test the marketing generator directly."""
    try:
        # Parse test content
        parser = create_universal_parser()
        marketing_data = parser.parse_html_content("/tmp/simple_debug_test.html")
        logger.info(f"Parsed marketing data: {marketing_data.title}")
        
        # Create config
        config = MarketingConfig(
            objective=MarketingObjective.THOUGHT_LEADERSHIP,
            target_audience=TargetAudience.EXECUTIVES,
            tone=ContentTone.PROFESSIONAL,
            industry_focus="technology",
            competitive_angle=True,
            include_data_points=True,
            urgency_level=0.7
        )
        
        # Create generator
        generator = create_marketing_generator()
        
        # Generate content
        logger.info("Starting content generation...")
        content_suite = await generator.generate_marketing_content(marketing_data, config)
        
        logger.info(f"✅ Content generation successful!")
        logger.info(f"Executive summary length: {len(content_suite.executive_summary.content)}")
        logger.info(f"Social media pieces: {len(content_suite.social_media_content)}")
        logger.info(f"Professional pieces: {len(content_suite.professional_content)}")
        logger.info(f"Campaign pieces: {len(content_suite.campaign_content)}")
        logger.info(f"Marketing strategy length: {len(content_suite.marketing_strategy.content)}")
        
        # Show first 200 chars of executive summary
        logger.info(f"Executive summary preview: {content_suite.executive_summary.content[:200]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"Marketing generator test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_marketing_generator())
    if success:
        print("✅ Marketing generator is working!")
    else:
        print("❌ Marketing generator test failed!")