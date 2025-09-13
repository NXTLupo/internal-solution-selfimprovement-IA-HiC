#!/bin/bash
# Script to update the OpenAI API key for the Journey Mapper application

# Text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}=== OpenAI Journey Mapper API Key Update Tool ===${NC}\n"

# Check if API key is provided as argument
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Please enter your OpenAI API key:${NC}"
    read -s API_KEY
    echo ""
else
    API_KEY=$1
fi

# Validate API key format (basic check)
if [[ ! $API_KEY =~ ^sk-[A-Za-z0-9]+$ ]]; then
    echo -e "${RED}Error: The API key format looks incorrect.${NC}"
    echo "OpenAI API keys typically start with 'sk-' followed by a string of letters and numbers."
    echo -e "${YELLOW}Do you want to continue anyway? (y/n)${NC}"
    read CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        exit 1
    fi
fi

# Check if .env file exists
if [ -f .env ]; then
    # Check if OPENAI_API_KEY already exists in .env
    if grep -q "OPENAI_API_KEY" .env; then
        # Replace existing key
        sed -i '' "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$API_KEY/" .env
        echo -e "${GREEN}Existing OpenAI API key updated in .env file.${NC}"
    else
        # Add new key
        echo "OPENAI_API_KEY=$API_KEY" >> .env
        echo -e "${GREEN}OpenAI API key added to .env file.${NC}"
    fi
else
    # Create new .env file
    echo "OPENAI_API_KEY=$API_KEY" > .env
    echo -e "${GREEN}Created new .env file with OpenAI API key.${NC}"
fi

# Also set environment variable for current session
export OPENAI_API_KEY=$API_KEY
echo -e "${GREEN}API key has been set for the current terminal session.${NC}"

# Verify the key by attempting to call the OpenAI API
echo -e "\n${YELLOW}Verifying API key...${NC}"
VERIFY_SCRIPT=$(cat <<EOF
import os
import sys
try:
    from openai import OpenAI
    client = OpenAI(api_key="$API_KEY")
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Hello, this is a test of the OpenAI API key."}],
        max_tokens=10
    )
    print("API key verification successful!")
    sys.exit(0)
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
EOF
)

if python3 -c "$VERIFY_SCRIPT"; then
    echo -e "${GREEN}Success! The OpenAI API key has been verified and is working correctly.${NC}"
    echo -e "\nYou can now use the OpenAI Journey Mapper application."
else
    echo -e "${RED}The API key could not be verified. It may be invalid or there might be connection issues.${NC}"
    echo "You can still try to use the application, but it might not work correctly."
fi

echo -e "\n${YELLOW}=== Setup Complete ===${NC}\n"