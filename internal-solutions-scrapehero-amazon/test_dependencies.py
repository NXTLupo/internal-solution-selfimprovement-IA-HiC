#!/usr/bin/env python
"""
Test script to verify that all required dependencies are installed and working.
"""
import sys
import importlib
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Required packages to check
REQUIRED_PACKAGES = [
    "anthropic",
    "google.generativeai",
    "openai",
    "python_dotenv",
    "flask",
    "requests",
    "selectorlib"
]

# Check for API keys
API_KEYS = {
    "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
    "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY")
}

def main():
    print("Checking required dependencies...\n")
    
    all_installed = True
    for package in REQUIRED_PACKAGES:
        try:
            mod = importlib.import_module(package)
            print(f"✅ {package} is installed ({getattr(mod, '__version__', 'version unknown')})")
        except ImportError:
            all_installed = False
            print(f"❌ {package} is NOT installed")
    
    print("\nChecking environment variables...")
    all_keys_present = True
    for key, value in API_KEYS.items():
        if value:
            # Show first/last few chars of API key
            masked_value = value[:4] + "..." + value[-4:]
            print(f"✅ {key} is set ({masked_value})")
        else:
            all_keys_present = False
            print(f"❌ {key} is NOT set")
    
    if all_installed and all_keys_present:
        print("\n✅ All dependencies and environment variables are correctly set up!")
        return 0
    else:
        print("\n❌ Some dependencies or environment variables are missing.")
        print("Please fix the issues above before running the application.")
        return 1

if __name__ == "__main__":
    sys.exit(main())