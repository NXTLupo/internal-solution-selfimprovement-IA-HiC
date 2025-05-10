#!/bin/bash

# This script updates all Anthropic API keys in your project files

# Set your API key here
NEW_API_KEY="***REDACTED-ANTHROPIC-KEY***"

# Update API key in start.sh
sed -i "s|***REDACTED-ANTHROPIC-KEY***|$NEW_API_KEY|g" start.sh

# Update API key in set_api_key.sh
sed -i "s|***REDACTED-ANTHROPIC-KEY***|$NEW_API_KEY|g" set_api_key.sh

# Set the API key for current session
export ANTHROPIC_API_KEY="$NEW_API_KEY"

echo "API key has been updated in all files"
echo "API key is also set in current environment: ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
echo "Test your setup with: python test_api_key.py"