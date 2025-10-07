#!/usr/bin/env python3
# This script loads environment variables from .env file
# It should be imported at the top of app.py

import os
import logging

logger = logging.getLogger("video-analyzer.load_env")

def load_env_file():
    """Load environment variables from .env file"""
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_file):
        logger.info(f"Loading environment variables from {env_file}")
        with open(env_file, "r") as f:
            for line in f:
                if line.strip() and "=" in line:
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value
                    masked_value = f"{value[:8]}..." if len(value) > 12 else value
                    logger.info(f"Set environment variable {key}={masked_value}")
        return True
    else:
        logger.warning(f".env file not found at {env_file}")
        return False

# Always load environment variables
load_env_file()

# Force set API key
os.environ['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY', '')
os.environ['USE_WHISPER_API'] = 'true'

# Log environment variables
logger.info(f"OPENAI_API_KEY: {os.environ.get('OPENAI_API_KEY', '')[:8]}...")
logger.info(f"USE_WHISPER_API: {os.environ.get('USE_WHISPER_API', 'not set')}")