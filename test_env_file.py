#!/usr/bin/env python3
import os
import sys
from pathlib import Path
from openai import OpenAI

def main():
    print("Testing OpenAI API key from .env file...")
    
    # Load from .env file manually
    env_file = Path(".env")
    if env_file.exists():
        print(f"Loading from {env_file.absolute()}")
        with open(env_file, "r") as f:
            for line in f:
                if line.strip() and "=" in line:
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value
                    print(f"Set environment variable {key}={value[:8]}...")
    
    # Get the API key from environment
    api_key = os.environ.get("OPENAI_API_KEY", "")
    
    if not api_key:
        print("Error: No OpenAI API key found in environment variables")
        sys.exit(1)
    
    # Mask the key for display
    masked_key = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "[INVALID]"
    print(f"Found API key: {masked_key} (length: {len(api_key)})")
    
    try:
        # Initialize OpenAI client with API key directly
        client = OpenAI(api_key=api_key)
        
        # Test API with a simple completion
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello, this is a test of the OpenAI API key."}],
            max_tokens=10
        )
        
        print("API test successful!")
        print(f"Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)