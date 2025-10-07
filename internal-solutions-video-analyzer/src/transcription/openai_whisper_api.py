import os
import logging
import asyncio
import time
from typing import Dict, List, Optional, Any, Union
import json
import httpx
from pydantic import BaseModel


# Added by fix script
os.environ['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY', os.environ.get('OPENAI_API_KEY', ''))


# Added by fix script
os.environ['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY', os.environ.get('OPENAI_API_KEY', ''))

from ..models import TranscriptionResult, TranscriptSegment

logger = logging.getLogger("video-analyzer.openai_whisper_api")

# Force set API key in this module
# API key loaded from root .env file by load_env.py
os.environ['USE_WHISPER_API'] = 'true'

# Get OpenAI API key from environment
def get_openai_api_key():
    """Get the OpenAI API key from the environment and clean it"""
    api_key = os.getenv("OPENAI_API_KEY", "")
    
    # Clean the API key in case it has newlines or other unexpected characters
    if api_key:
        api_key = api_key.strip().split('\n')[0].strip()
    
    # Debug logging
    logger.info(f"API Key from env: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else ''} (length: {len(api_key)})")
    return api_key

OPENAI_API_KEY = get_openai_api_key()
logger.info(f"OpenAI API key loaded: {bool(OPENAI_API_KEY)}, Length: {len(OPENAI_API_KEY) if OPENAI_API_KEY else 0}")

# Add even more debug logging
logger.info(f"Initial API key load: {OPENAI_API_KEY[:8]}...{OPENAI_API_KEY[-4:] if len(OPENAI_API_KEY) > 12 else ''}")
