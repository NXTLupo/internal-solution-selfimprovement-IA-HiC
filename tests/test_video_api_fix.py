#!/usr/bin/env python3
"""Test script to verify Video Analyzer is using the correct OpenAI API key from root .env"""

import os
import sys
from pathlib import Path

# Add the video analyzer directory to path
video_analyzer_dir = Path(__file__).parent / "internal-solutions-video-analyzer"
sys.path.insert(0, str(video_analyzer_dir))

# Clear any existing OPENAI_API_KEY to test loading from .env
if 'OPENAI_API_KEY' in os.environ:
    del os.environ['OPENAI_API_KEY']
    print("Cleared existing OPENAI_API_KEY from environment")

# Import load_env which should load from root .env
import load_env

# Check if API key is loaded correctly
api_key = os.environ.get('OPENAI_API_KEY', '')
if api_key:
    print(f"\n[SUCCESS] OPENAI_API_KEY loaded from root .env")
    print(f"  Key preview: {api_key[:15]}...")

    # Check if it's the correct key from root .env
    root_env_file = Path(__file__).parent / ".env"
    if root_env_file.exists():
        with open(root_env_file, "r") as f:
            for line in f:
                if line.strip() and line.startswith("OPENAI_API_KEY="):
                    expected_key = line.strip().split("=", 1)[1]
                    if api_key == expected_key:
                        print(f"  [OK] Key matches root .env file")
                    else:
                        print(f"  [WARNING] Key does not match root .env file!")
                        print(f"    Expected: {expected_key[:15]}...")
                        print(f"    Got: {api_key[:15]}...")
                    break
else:
    print("\n[ERROR] OPENAI_API_KEY not loaded!")
    print("  Please check the root .env file contains OPENAI_API_KEY")

# Test OpenAI client initialization
try:
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    print(f"\n[OK] OpenAI client initialized successfully")
except Exception as e:
    print(f"\n[ERROR] Error initializing OpenAI client: {e}")

print("\n" + "="*60)
print("Video Analyzer API Key Configuration Test Complete")
print("="*60)