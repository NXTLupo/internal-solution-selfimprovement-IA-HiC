#!/usr/bin/env python3
# This script must be imported at the start of the application
import os
import sys
import logging

# Force set environment variables
os.environ['OPENAI_API_KEY'] = '***REDACTED-OPENAI-KEY***'
os.environ['USE_WHISPER_API'] = 'true'

# Log that we've set the variables
logging.info(f"set_env_at_startup.py: Set OPENAI_API_KEY=sk-proj-...")
logging.info(f"set_env_at_startup.py: Set USE_WHISPER_API=true")
