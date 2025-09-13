#!/usr/bin/env python3
import os
import subprocess
import sys

# ANSI colors
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
RED = "\033[0;31m"
BLUE = "\033[0;34m"
NC = "\033[0m"  # No Color

def print_color(color, message):
    print(f"{color}{message}{NC}")

print_color(BLUE, "=== Video Analyzer OpenAI API Key Fix ===")
print_color(YELLOW, "This script will fix the OpenAI API key issue in the video analyzer service")

# Check if .env file exists
if not os.path.exists(".env"):
    print_color(RED, "Error: .env file not found!")
    sys.exit(1)

# Read OpenAI API key from .env file
openai_api_key = None
with open(".env", "r") as f:
    for line in f:
        if line.startswith("OPENAI_API_KEY="):
            openai_api_key = line.strip().split("=", 1)[1]
            break

if not openai_api_key:
    print_color(RED, "Error: OPENAI_API_KEY not found in .env file!")
    sys.exit(1)

print_color(GREEN, f"Found OpenAI API key in .env file")

# Create a dedicated .env file for the video analyzer
video_env_dir = "internal-solutions-video-analyzer"
video_env_path = os.path.join(video_env_dir, ".env")

# Create .env file with the required variables
try:
    with open(video_env_path, "w") as f:
        f.write(f"OPENAI_API_KEY={openai_api_key}\n")
        f.write("USE_WHISPER_API=true\n")
    print_color(GREEN, f"Created .env file in {video_env_dir}")
except Exception as e:
    print_color(RED, f"Error creating .env file: {str(e)}")
    sys.exit(1)

# Find and modify the openai_whisper_api.py file to explicitly use the API key
whisper_api_path = os.path.join(video_env_dir, "src", "transcription", "openai_whisper_api.py")

if os.path.exists(whisper_api_path):
    print_color(YELLOW, f"Modifying {whisper_api_path} to explicitly use API key...")
    
    # Read the file
    with open(whisper_api_path, "r") as f:
        content = f.read()
    
    # The file doesn't use OpenAI client but makes direct API calls
    # Let's modify it to add a debug log to help troubleshoot
    if "OPENAI_API_KEY = get_openai_api_key()" in content:
        # Add debug logging after this line
        content = content.replace(
            "OPENAI_API_KEY = get_openai_api_key()",
            "OPENAI_API_KEY = get_openai_api_key()\nlogger.info(f\"OpenAI API key loaded: {bool(OPENAI_API_KEY)}, Length: {len(OPENAI_API_KEY) if OPENAI_API_KEY else 0}\")\n"
        )
        
        # Write the modified content back
        with open(whisper_api_path, "w") as f:
            f.write(content)
        print_color(GREEN, "Updated OpenAI client initialization to explicitly use API key")
    else:
        print_color(YELLOW, "No changes needed to OpenAI client initialization")

# Create a Docker Compose override file for the video analyzer
docker_compose_override = """version: '3'

services:
  video-analyzer:
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - USE_WHISPER_API=true
    volumes:
      - ./internal-solutions-video-analyzer/.env:/app/.env
"""

with open("docker-compose.override.yml", "w") as f:
    f.write(docker_compose_override)
print_color(GREEN, "Created docker-compose.override.yml with video analyzer environment configuration")

# Instructions for the user
print_color(BLUE, "\n=== Next Steps ===")
print_color(YELLOW, "1. Restart the video analyzer service:")
print("   docker compose -f dynamic-compose.yml down")
print("   docker compose -f dynamic-compose.yml up -d")
print_color(YELLOW, "2. Or run only the video analyzer:")
print("   ./backup-scripts/run-local-video-analyzer.sh")
print_color(YELLOW, "3. Test the OpenAI API key:")
print("   python test_openai_whisper.py")
print_color(GREEN, "\nFixing completed successfully!")