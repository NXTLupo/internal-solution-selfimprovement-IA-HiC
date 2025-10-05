#!/usr/bin/env python3
import os
from pathlib import Path

# Load API key from root .env file
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
                        print(f"inject_env.py: Loaded OPENAI_API_KEY from root .env")
                        break
    else:
        print(f"WARNING: Root .env file not found at {root_env_file}")

# Set default for USE_WHISPER_API
if not os.environ.get('USE_WHISPER_API'):
    os.environ['USE_WHISPER_API'] = 'true'

print(f"inject_env.py: OPENAI_API_KEY is {'set' if os.environ.get('OPENAI_API_KEY') else 'NOT set'}")
print(f"inject_env.py: USE_WHISPER_API = {os.environ.get('USE_WHISPER_API')}")
