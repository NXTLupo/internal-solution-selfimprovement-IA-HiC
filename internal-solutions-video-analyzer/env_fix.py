#!/usr/bin/env python3
import os
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

# Load API key from root .env file
API_KEY = None
root_dir = Path(__file__).parent.parent
root_env_file = root_dir / ".env"

if root_env_file.exists():
    with open(root_env_file, "r") as f:
        for line in f:
            if line.strip() and "=" in line and not line.startswith("#"):
                key, value = line.strip().split("=", 1)
                if key == "OPENAI_API_KEY":
                    API_KEY = value
                    logger.info(f"Loaded API key from root .env: {API_KEY[:8]}...{API_KEY[-4:]}")
                    break

if not API_KEY:
    logger.error("No OPENAI_API_KEY found in root .env file!")
    exit(1)

# Apply to environment directly
os.environ["OPENAI_API_KEY"] = API_KEY
os.environ["USE_WHISPER_API"] = "true"

# Verify
logger.info(f"OPENAI_API_KEY in environment: {os.environ.get('OPENAI_API_KEY', 'not set')[:8]}...")
logger.info(f"USE_WHISPER_API in environment: {os.environ.get('USE_WHISPER_API', 'not set')}")

# Create a permanent .env file
with open("/app/.env", "w") as f:
    f.write(f"OPENAI_API_KEY={API_KEY}\n")
    f.write("USE_WHISPER_API=true\n")
logger.info("Created /app/.env file")

# Update app.py by inserting the key
import subprocess
subprocess.run([
    "sed", "-i", 
    "1i import os\nos.environ['OPENAI_API_KEY'] = '{}' # Added by fix\nos.environ['USE_WHISPER_API'] = 'true'".format(API_KEY),
    "/app/src/app.py"
])
logger.info("Updated app.py to set environment variables at startup")

# Update transcription modules
for module in [
    "/app/src/transcription/openai_whisper_api.py",
    "/app/src/transcription/robust_whisper_api.py"
]:
    if os.path.exists(module):
        subprocess.run([
            "sed", "-i", 
            "1i import os\nos.environ['OPENAI_API_KEY'] = '{}' # Added by fix\nos.environ['USE_WHISPER_API'] = 'true'".format(API_KEY),
            module
        ])
        logger.info(f"Updated {module} to set environment variables")

print("Environment variables and files have been updated successfully!")
