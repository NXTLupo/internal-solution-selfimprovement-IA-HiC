#!/bin/bash
# Script to update OpenAI API key in the .env file

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}"
echo "███╗   ██╗██╗  ██╗████████╗    ██╗  ██╗██╗   ██╗███╗   ███╗ █████╗ ███╗   ██╗███████╗"
echo "████╗  ██║╚██╗██╔╝╚══██╔══╝    ██║  ██║██║   ██║███╗ ████║██╔══██╗████╗  ██║██╔════╝"
echo "██╔██╗ ██║ ╚███╔╝    ██║       ███████║██║   ██║██╔████╔██║███████║██╔██╗ ██║███████╗"
echo "██║╚██╗██║ ██╔██╗    ██║       ██╔══██║██║   ██║██║╚██╔╝██║██╔══██║██║╚██╗██║╚════██║"
echo "██║ ╚████║██╔╝ ██╗   ██║       ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║  ██║██║ ╚████║███████║"
echo "╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝"
echo -e "${NC}"

echo -e "${GREEN}${BOLD}OpenAI API Key Update Tool${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if API key is provided as argument
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Please enter your OpenAI API key:${NC}"
    read -s API_KEY
    echo ""
else
    API_KEY=$1
fi

# Validate API key format (basic check)
if [[ ! $API_KEY =~ ^sk- ]]; then
    echo -e "${RED}Warning: The API key format looks incorrect.${NC}"
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

# Ensure USE_WHISPER_API is set
if grep -q "USE_WHISPER_API" .env; then
    sed -i '' "s/USE_WHISPER_API=.*/USE_WHISPER_API=true/" .env
else
    echo "USE_WHISPER_API=true" >> .env
fi
echo -e "${GREEN}Set USE_WHISPER_API=true in .env file.${NC}"

# Copy to other needed locations
echo -e "${YELLOW}Updating API key in all service directories...${NC}"

# Update video-analyzer .env file
mkdir -p internal-solutions-video-analyzer
if [ -f internal-solutions-video-analyzer/.env ]; then
    if grep -q "OPENAI_API_KEY" internal-solutions-video-analyzer/.env; then
        sed -i '' "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$API_KEY/" internal-solutions-video-analyzer/.env
    else
        echo "OPENAI_API_KEY=$API_KEY" >> internal-solutions-video-analyzer/.env
    fi
    
    if grep -q "USE_WHISPER_API" internal-solutions-video-analyzer/.env; then
        sed -i '' "s/USE_WHISPER_API=.*/USE_WHISPER_API=true/" internal-solutions-video-analyzer/.env
    else
        echo "USE_WHISPER_API=true" >> internal-solutions-video-analyzer/.env
    fi
else
    echo "OPENAI_API_KEY=$API_KEY" > internal-solutions-video-analyzer/.env
    echo "USE_WHISPER_API=true" >> internal-solutions-video-analyzer/.env
fi
echo -e "${GREEN}Updated video-analyzer environment files.${NC}"

# Update OpenAI Journey Mapper .env file
mkdir -p internal-solutions-openai-journey-mapper
if [ -f internal-solutions-openai-journey-mapper/.env ]; then
    if grep -q "OPENAI_API_KEY" internal-solutions-openai-journey-mapper/.env; then
        sed -i '' "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$API_KEY/" internal-solutions-openai-journey-mapper/.env
    else
        echo "OPENAI_API_KEY=$API_KEY" >> internal-solutions-openai-journey-mapper/.env
    fi
else
    echo "OPENAI_API_KEY=$API_KEY" > internal-solutions-openai-journey-mapper/.env
    echo "OPENAI_MODEL=o3" >> internal-solutions-openai-journey-mapper/.env
    echo "REASONING_EFFORT=medium" >> internal-solutions-openai-journey-mapper/.env
fi
echo -e "${GREEN}Updated OpenAI Journey Mapper environment files.${NC}"

# Update app.py to use the new API key
APP_PY_PATH="internal-solutions-video-analyzer/src/app.py"
if [ -f "$APP_PY_PATH" ]; then
    # Check if there are hardcoded API keys
    if grep -q "os.environ\['OPENAI_API_KEY'\] = " "$APP_PY_PATH"; then
        # Replace all hardcoded API keys with a single line
        TMP_FILE=$(mktemp)
        awk -v key="$API_KEY" '
        /# Force set API key/{
            found=1
            print "# Force set API key for video transcription"
            printf "os.environ['\''OPENAI_API_KEY'\''] = '\''%s'\''\n", key
            print "# Enable Whisper API"
            print "os.environ['\''USE_WHISPER_API'\''] = '\''true'\''"
            # Skip existing API key lines
            while (getline && /os.environ.*OPENAI_API_KEY/) {}
            if (!match($0, /os.environ.*OPENAI_API_KEY/)) {
                print
            }
            next
        }
        {print}' "$APP_PY_PATH" > "$TMP_FILE"
        cat "$TMP_FILE" > "$APP_PY_PATH"
        rm "$TMP_FILE"
        echo -e "${GREEN}Updated API key in $APP_PY_PATH${NC}"
    fi
fi

# Create a Docker Compose override file
cat > docker-compose.override.yml << EOF
version: '3'

services:
  video-analyzer:
    environment:
      - OPENAI_API_KEY=$API_KEY
      - USE_WHISPER_API=true
    volumes:
      - ./internal-solutions-video-analyzer/.env:/app/.env
EOF
echo -e "${GREEN}Created docker-compose.override.yml with OpenAI API key configuration${NC}"

# Check if Docker is running
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo -e "${YELLOW}Updating running containers with new API key...${NC}"
    
    # Find video-analyzer container
    VIDEO_CONTAINER=$(docker ps --format "{{.Names}}" | grep -E "video-analyzer")
    
    if [ -n "$VIDEO_CONTAINER" ]; then
        echo -e "${GREEN}Updating container: ${VIDEO_CONTAINER}${NC}"
        
        # Create a temporary .env file to copy into the container
        echo "OPENAI_API_KEY=$API_KEY" > temp_video_env
        echo "USE_WHISPER_API=true" >> temp_video_env
        docker cp temp_video_env ${VIDEO_CONTAINER}:/app/.env
        rm temp_video_env
        echo -e "${GREEN}Updated environment in video-analyzer container${NC}"
        
        # Restart the container
        docker restart ${VIDEO_CONTAINER}
        echo -e "${GREEN}Restarted video-analyzer container${NC}"
    else
        echo -e "${YELLOW}No video-analyzer container found running${NC}"
    fi
fi

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
    echo -e "\nYou can now use all OpenAI-based features in the NXT HUMANS AI CX WORKBENCH."
else
    echo -e "${RED}The API key could not be verified. It may be invalid or there might be connection issues.${NC}"
    echo "You can still try to use the application, but OpenAI-based features might not work correctly."
fi

echo -e "\n${YELLOW}To restart all services with the new API key, run:${NC}"
echo -e "${BLUE}./launch.sh${NC}"

echo -e "\n${GREEN}${BOLD}Setup Complete${NC}\n"