#!/bin/bash

# Script to update the Anthropic API key for Claude 4 Journey Mapper

echo "Claude 4 Journey Mapper - API Key Update Tool"
echo "--------------------------------------------"
echo ""

# Check if API key is provided as argument
if [ $# -eq 1 ]; then
    API_KEY=$1
else
    # Prompt for API key
    read -p "Enter your Anthropic API key (starts with sk-ant-): " API_KEY
fi

# Validate API key format
if [[ ! $API_KEY =~ ^sk-ant- ]]; then
    echo "Error: The API key format is invalid. It should start with 'sk-ant-'"
    exit 1
fi

# Save to environment file
echo "ANTHROPIC_API_KEY=$API_KEY" > .env
echo "ANTHROPIC_MODEL=claude-sonnet-4-20250514" >> .env

echo ""
echo "✅ API key has been updated successfully!"
echo "Run ./start.sh to start the application."
echo ""

# Optional: Test the API key
read -p "Would you like to test the API key? (y/n): " TEST_KEY

if [[ $TEST_KEY == "y" || $TEST_KEY == "Y" ]]; then
    echo "Testing API key with Anthropic's Claude 4 API..."
    
    # Use Python to test the API key
    python -c "
import requests
import os
import sys

api_key = '$API_KEY'

try:
    response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers={
            'anthropic-version': '2023-06-01',
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        },
        json={
            'model': 'claude-sonnet-4-20250514',
            'messages': [{'role': 'user', 'content': 'Hello'}],
            'max_tokens': 10
        },
        timeout=15
    )
    
    if response.status_code == 200:
        print('\n✅ API key is valid and working correctly with Claude 4!')
        sys.exit(0)
    else:
        print(f'\n❌ API key test failed with status code: {response.status_code}')
        print(f'Error: {response.json().get(\"error\", {}).get(\"message\", \"Unknown error\")}')
        sys.exit(1)
except Exception as e:
    print(f'\n❌ API key test failed with error: {str(e)}')
    sys.exit(1)
"

    # Check Python script exit code
    if [ $? -eq 0 ]; then
        echo "You're all set to use Claude 4 Journey Mapper!"
    else
        echo "Please check your API key and try again."
    fi
fi

exit 0