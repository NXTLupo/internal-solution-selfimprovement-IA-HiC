import anthropic
import os
import sys

# Set API key directly
os.environ['ANTHROPIC_API_KEY'] = '***REDACTED-ANTHROPIC-KEY***'

try:
    client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))
    response = client.messages.create(
        model='claude-3-7-sonnet-20250219',
        max_tokens=100,
        messages=[{'role': 'user', 'content': 'Say "API TEST SUCCESSFUL"'}]
    )
    print(f'API Test Result: {response.content[0].text}')
    print('API key is valid!')
    sys.exit(0)
except Exception as e:
    print(f'Error testing API key: {e}')
    sys.exit(1)
