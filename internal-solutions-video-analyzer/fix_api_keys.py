#!/usr/bin/env python3
"""
Script to remove all hardcoded OpenAI API keys from Video Analyzer service
and replace them with proper environment variable loading from root .env file
"""

import os
import re
from pathlib import Path

# Files that potentially contain hardcoded API keys
FILES_TO_CHECK = [
    "src/transcription/whisper_api_patch.py",
    "src/transcription/openai_whisper_api.py",
    "src/transcription/robust_whisper_api.py",
    "src/app.py",
    "src/fix_app.py",
    "new_transcribe.py"
]

def remove_hardcoded_keys(file_path):
    """Remove hardcoded API keys and replace with environment variable loading"""

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r') as f:
        content = f.read()

    # Pattern to match hardcoded API keys
    patterns = [
        # Direct assignment patterns
        (r"OPENAI_API_KEY\s*=\s*['\"]sk-proj-[^'\"]+['\"]", "OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')"),
        (r"api_key\s*=\s*['\"]sk-proj-[^'\"]+['\"]", "api_key=os.environ.get('OPENAI_API_KEY', '')"),
        (r"openai\.api_key\s*=\s*['\"]sk-proj-[^'\"]+['\"]", "openai.api_key = os.environ.get('OPENAI_API_KEY', '')"),
        # Environment variable assignments
        (r"os\.environ\[['\"]\s*OPENAI_API_KEY\s*['\"]\]\s*=\s*['\"]sk-proj-[^'\"]+['\"]",
         "# API key loaded from root .env file by load_env.py"),
    ]

    modified = False
    for pattern, replacement in patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            modified = True
            print(f"  - Removed hardcoded API key pattern: {pattern[:50]}...")

    if modified:
        # Ensure the file imports os if it uses environment variables
        if "import os" not in content and "os.environ" in content:
            content = "import os\n" + content

        with open(file_path, 'w') as f:
            f.write(content)
        print(f"[FIXED] {file_path}")
    else:
        print(f"  No hardcoded keys found in: {file_path}")

def main():
    """Main function to fix all files"""
    print("Fixing hardcoded API keys in Video Analyzer service...")
    print("="*60)

    # Get the directory of this script
    base_dir = Path(__file__).parent

    for file_rel_path in FILES_TO_CHECK:
        file_path = base_dir / file_rel_path
        remove_hardcoded_keys(file_path)

    print("="*60)
    print("[COMPLETE] All files have been checked and fixed!")
    print("\nThe Video Analyzer will now use the OPENAI_API_KEY from the root .env file.")
    print("Make sure the root .env file contains the correct OPENAI_API_KEY.")

if __name__ == "__main__":
    main()