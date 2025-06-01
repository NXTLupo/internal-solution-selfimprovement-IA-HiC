#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Fixing OpenAI Journey Mapper API key...${NC}"

# Check if .env file exists in root directory
if [ ! -f .env ]; then
  echo -e "${RED}Error: No .env file found in the root directory!${NC}"
  exit 1
fi

# Extract OpenAI API key from root .env file
OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env | cut -d '=' -f2)

if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${RED}Error: No OPENAI_API_KEY found in the .env file!${NC}"
  exit 1
fi

echo -e "${GREEN}Found OpenAI API key in root .env file.${NC}"

# Create a fresh .env file for the OpenAI Journey Mapper
mkdir -p internal-solutions-openai-journey-mapper
cat > internal-solutions-openai-journey-mapper/.env << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=o3
REASONING_EFFORT=medium
EOF

echo -e "${GREEN}Created .env file for OpenAI Journey Mapper with API key.${NC}"

# Start the OpenAI Journey Mapper directly
echo -e "${YELLOW}Starting OpenAI Journey Mapper...${NC}"
cd internal-solutions-openai-journey-mapper
python3 run.py