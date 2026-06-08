import os
import anthropic

"""
Python equivalent of the curl command for Claude 4.5:

curl https://api.anthropic.com/v1/messages \
    --header "x-api-key: $ANTHROPIC_API_KEY" \
    --header "anthropic-version: 2023-06-01" \
    --header "content-type: application/json" \
    --data '{
   "model": "claude-opus-4-8",
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
    # Send request to Claude 4.5
    response = client.messages.create(
        model="claude-opus-4-8",  # Claude 4.5 Opus model
        max_tokens=1024,                   # Maximum tokens in response
        messages=[                         # Message content
            {"role": "user", "content": "Hello, world"}
        ]
    )
    
    # Print the response content
    print("\nResponse from Claude 4.5:")
    print(response.content[0].text)
    
except Exception as e:
    print(f"Error: {str(e)}")