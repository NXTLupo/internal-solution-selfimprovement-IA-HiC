#!/usr/bin/env python3
# This script must be imported at the start of the application
import os
import sys
import logging
from pathlib import Path

# Load from root .env file if not already set
if not os.environ.get('OPENAI_API_KEY'):
    root_dir = Path(__file__).parent.parent
    root_env_file = root_dir / ".env"

    if root_env_file.exists():
        with open(root_env_file, "r") as f:
            for line in f:
                if line.strip() and "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    if key == "OPENAI_API_KEY":
                        os.environ[key] = value
                        logging.info(f"set_env_at_startup.py: Loaded OPENAI_API_KEY from root .env")
                        break
    else:
        logging.warning(f"set_env_at_startup.py: Root .env file not found at {root_env_file}")

# Set default for USE_WHISPER_API if not set
if not os.environ.get('USE_WHISPER_API'):
    os.environ['USE_WHISPER_API'] = 'true'
    logging.info(f"set_env_at_startup.py: Set USE_WHISPER_API=true (default)")

# Log current state
if os.environ.get('OPENAI_API_KEY'):
    key_preview = os.environ.get('OPENAI_API_KEY', '')[:15]
    logging.info(f"set_env_at_startup.py: OPENAI_API_KEY is set: {key_preview}...")
else:
    logging.error("set_env_at_startup.py: No OPENAI_API_KEY found!")
