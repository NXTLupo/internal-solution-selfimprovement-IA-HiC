#!/usr/bin/env python3
import os
import time

# Log environment variables related to OpenAI
print("=== OpenAI API Key Validation ===")
print("OPENAI_API_KEY environment variable:", 
      "Set" if os.environ.get('OPENAI_API_KEY') else "Not set")
if os.environ.get('OPENAI_API_KEY'):
    print("Key starts with:", os.environ.get('OPENAI_API_KEY')[:10] + "...")
print("USE_WHISPER_API environment variable:", os.environ.get('USE_WHISPER_API', 'Not set'))

# Try to import and use the OpenAI client
try:
    import openai
    print("OpenAI client imported successfully")
    
    # Check if key is set in the client
    if openai.api_key:
        print("OpenAI client API key is set")
        print("Key starts with:", openai.api_key[:10] + "...")
    else:
        print("OpenAI client API key is NOT set")
        
    # Try to force set the key in the client
    openai.api_key = os.environ.get('OPENAI_API_KEY', 'NO_KEY_FOUND')
    print("After force setting, OpenAI client API key starts with:", 
          openai.api_key[:10] + "..." if openai.api_key else "Not set")
          
except ImportError:
    print("OpenAI client not installed")
except Exception as e:
    print("Error checking OpenAI client:", str(e))

# Create a marker file to show this script ran
with open("/tmp/key_validation_ran.txt", "w") as f:
    f.write(f"Validation ran at {time.time()}")

print("=== Validation Complete ===")
