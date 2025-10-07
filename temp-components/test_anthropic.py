#!/usr/bin/env python3
import anthropic
import os

# Set API key from environment or use default
api_key = os.environ.get("ANTHROPIC_API_KEY", os.environ.get("ANTHROPIC_API_KEY", ""))

# Work around SDK issue by setting env var instead of passing to constructor
os.environ["ANTHROPIC_API_KEY"] = api_key

# Initialize client
client = anthropic.Anthropic()

try:
    # Create a message
    message = client.messages.create(
        model="claude-3-7-sonnet-20250219",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "Hello, Claude"}
        ]
    )
    
    # Print response
    print("\nResponse from Claude:")
    print(message.content)

except Exception as e:
    print(f"\nError: {str(e)}")