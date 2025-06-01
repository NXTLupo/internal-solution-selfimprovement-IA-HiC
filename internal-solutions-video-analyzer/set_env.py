#!/usr/bin/env python3
import os

# Force set environment variables
os.environ['OPENAI_API_KEY'] = '***REDACTED-OPENAI-KEY***'
os.environ['USE_WHISPER_API'] = 'true'

# Print for verification
print(f"Environment variable OPENAI_API_KEY set: sk-proj-A9...")
print(f"Environment variable USE_WHISPER_API set: true")
