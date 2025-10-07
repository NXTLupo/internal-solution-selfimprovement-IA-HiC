import os
import anthropic

"""
Python equivalent of the curl command for Claude 3.7:

curl https://api.anthropic.com/v1/messages \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "anthropic-version: 2023-06-01" \
    --header "content-type: application/json" \
    --data '{
   "model": "claude-3-7-sonnet-20250219",
   "max_tokens": 1024,
   "messages": [
       {"role": "user", "content": "Hello, world"}
   ]
}'
"""

# API key from the codebase
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Initialize client (API key is passed here, equivalent to x-api-key header)
client = anthropic.Anthropic(api_key=API_KEY)

try:
    # Send request to Claude 3.7
    response = client.messages.create(
        model="claude-3-7-sonnet-20250219",  # Claude 3.7 Sonnet model
        max_tokens=1024,                     # Maximum tokens in response
        messages=[                           # Message content
            {"role": "user", "content": "Hello, world"}
        ]
    )
    
    # Print the response content
    print("\nResponse from Claude 3.7:")
    print(response.content[0].text)
    
except Exception as e:
    print(f"Error: {str(e)}")