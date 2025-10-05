#!/usr/bin/env python3
import os
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
                        print(f"Loaded OPENAI_API_KEY from root .env file")
                        break
    else:
        print(f"WARNING: Root .env file not found at {root_env_file}")

if not os.environ.get('USE_WHISPER_API'):
    os.environ['USE_WHISPER_API'] = 'true'

# Print for verification
current_key = os.environ.get('OPENAI_API_KEY', '')
if current_key:
    print(f"Environment variable OPENAI_API_KEY set: {current_key[:15]}...")
else:
    print("WARNING: No OPENAI_API_KEY found!")
print(f"Environment variable USE_WHISPER_API set: {os.environ.get('USE_WHISPER_API')}")