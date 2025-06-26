#!/usr/bin/env python3
"""
Test script to verify A11y Image Captioner service connectivity
Run this inside the FLUX LoRA Studio Docker container to diagnose connection issues
"""
import asyncio
import aiohttp
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_image_captioner_connection():
    """Test connection to A11y Image Captioner service"""
    
    # Get the service URL
    IMAGE_CAPTIONER_URL = os.environ.get('IMAGE_CAPTIONER_URL', 'http://image-captioner:5005')
    logger.info(f"Testing connection to: {IMAGE_CAPTIONER_URL}")
    
    tests = [
        ("Health Check", f"{IMAGE_CAPTIONER_URL}/health"),
        ("Root Endpoint", f"{IMAGE_CAPTIONER_URL}/"),
        ("Direct Container", "http://image-captioner:5005/health"),
        ("Localhost", "http://localhost:5005/health"),
    ]
    
    for test_name, url in tests:
        logger.info(f"\n=== {test_name} ===")
        logger.info(f"URL: {url}")
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(url, timeout=10) as response:
                    logger.info(f"Status: {response.status}")
                    if response.status == 200:
                        try:
                            result = await response.json()
                            logger.info(f"Response: {result}")
                        except:
                            text = await response.text()
                            logger.info(f"Response: {text[:200]}...")
                    else:
                        text = await response.text()
                        logger.warning(f"Error response: {text[:200]}...")
        except Exception as e:
            logger.error(f"Connection failed: {type(e).__name__}: {e}")
    
    # Test environment variables
    logger.info(f"\n=== Environment Variables ===")
    for key in ['IMAGE_CAPTIONER_URL', 'IMAGE_CAPTIONER_CLIENT_URL', 'ANTHROPIC_API_KEY']:
        value = os.environ.get(key, 'NOT_SET')
        if 'API_KEY' in key:
            value = f"{value[:10]}..." if value != 'NOT_SET' else 'NOT_SET'
        logger.info(f"{key}={value}")

if __name__ == "__main__":
    asyncio.run(test_image_captioner_connection())