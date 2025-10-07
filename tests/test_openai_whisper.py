import os
import sys
from openai import OpenAI

# Print diagnostics
print("=== OpenAI API Key Diagnostics ===")
print(f"Python version: {sys.version}")

# Check if OPENAI_API_KEY is in environment
api_key = os.environ.get("OPENAI_API_KEY")
if api_key:
    # Show first 10 chars and last 5 chars
    masked_key = f"{api_key[:10]}...{api_key[-5:]}"
    print(f"OPENAI_API_KEY found in environment: {masked_key}")
else:
    print("WARNING: OPENAI_API_KEY not found in environment!")
    
    # Fallback to a direct key
    api_key = "***REDACTED-OPENAI-KEY***"
    print(f"Using hardcoded API key: {api_key[:10]}...{api_key[-5:]}")

try:
    # Initialize with explicit API key
    client = OpenAI(api_key=api_key)
    print("Successfully initialized OpenAI client with explicit API key")
    
    # Test API key with a models list request (doesn't cost credits)
    models = client.models.list()
    print(f"API key is valid! Found {len(models.data)} models.")
    
    # Check specifically for whisper-1 model
    whisper_available = any(model.id == "whisper-1" for model in models.data)
    print(f"Whisper-1 model available: {whisper_available}")
    
    print("\n=== SUCCESS: Your OpenAI API key is valid! ===")
    
except Exception as e:
    print(f"\n=== ERROR: OpenAI API test failed ===")
    print(f"Error message: {str(e)}")
    print("\nPossible causes:")
    print("1. The API key format is incorrect")
    print("2. The API key has expired or been revoked")
    print("3. The API key doesn't have access to the required models")
    print("4. Network connectivity issues")