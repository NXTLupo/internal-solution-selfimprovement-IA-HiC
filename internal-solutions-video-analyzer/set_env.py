#!/usr/bin/env python3
import os

# Only set environment variables if they're not already set (let Docker override)
if not os.environ.get('OPENAI_API_KEY'):
    os.environ['OPENAI_API_KEY'] = '***REDACTED-OPENAI-KEY***'

if not os.environ.get('USE_WHISPER_API'):
    os.environ['USE_WHISPER_API'] = 'true'

# Print for verification
current_key = os.environ.get('OPENAI_API_KEY', '')
print(f"Environment variable OPENAI_API_KEY set: {current_key[:15]}...")
print(f"Environment variable USE_WHISPER_API set: {os.environ.get('USE_WHISPER_API')}")