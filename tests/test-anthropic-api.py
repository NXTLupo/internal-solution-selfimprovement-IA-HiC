#!/usr/bin/env python3
import sys
import os
import anthropic

def test_anthropic_api():
    """Test the Anthropic API with the current API key"""
    print("Testing Anthropic API connection...")
    
    # Get API key from environment variable or input
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        api_key = input("Enter your Anthropic API key: ")
    
    model = os.environ.get('ANTHROPIC_MODEL', 'claude-3-7-sonnet-20250219')
    
    print(f"Using model: {model}")
    
    try:
        # Initialize the Anthropic client
        client = anthropic.Anthropic(
            api_key=api_key
        )
        
        # Make a simple test request
        print("Sending test request to Anthropic API...")
        response = client.messages.create(
            model=model,
            max_tokens=100,
            messages=[
                {"role": "user", "content": "Hello, this is a test message to confirm API connectivity. Please reply with 'API connection successful' if you receive this."}
            ]
        )
        
        # Print the response
        print("\nAPI Response:")
        print("-" * 40)
        print(response.content[0].text)
        print("-" * 40)
        
        print("\n✅ API connection test successful!")
        return True
        
    except Exception as e:
        print("\n❌ Error connecting to Anthropic API:")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print("\nPlease check that:")
        print("1. Your API key is valid")
        print("2. The Anthropic API is available")
        print("3. You have network connectivity to the Anthropic API")
        return False

if __name__ == "__main__":
    success = test_anthropic_api()
    sys.exit(0 if success else 1)