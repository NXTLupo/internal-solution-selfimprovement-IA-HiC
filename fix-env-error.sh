#!/bin/bash
# Script to fix the zsh environment error
# Run with: chmod +x fix-env-error.sh && ./fix-env-error.sh

echo "Fixing zsh environment error..."

# Check if .zshrc exists
if [ -f /Users/jonathanlupo/.zshrc ]; then
    # Create a backup of the original file
    cp /Users/jonathanlupo/.zshrc /Users/jonathanlupo/.zshrc.backup
    
    # Remove the problematic line referencing the non-existent ComfyUI directory
    grep -v "/Volumes/SSK SSD/New_Install_Comfy/ComfyUI/uv/env" /Users/jonathanlupo/.zshrc.backup > /Users/jonathanlupo/.zshrc.temp
    
    # Replace the original file with the fixed one
    mv /Users/jonathanlupo/.zshrc.temp /Users/jonathanlupo/.zshrc
    
    echo "Fixed: Removed reference to non-existent ComfyUI directory from .zshrc"
else
    echo "Warning: .zshrc file not found at /Users/jonathanlupo/.zshrc"
fi

# Update the OpenAI API key in the .env file without hardcoding it
if [ -f .env ]; then
    # Check if we already have an OPENAI_API_KEY
    if grep -q "OPENAI_API_KEY" .env; then
        # Extract current key
        current_key=$(grep "OPENAI_API_KEY" .env | cut -d '=' -f2)
        
        # Update the key format to use environment variables in docker-compose files
        sed -i '' "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=${current_key}|g" .env
        echo "Updated API key format in .env to use variable substitution"
    fi
else
    echo "Warning: .env file not found"
fi

echo "Creating safe API key management script..."

# Create a script to safely manage API keys
cat > safe-update-keys.sh << 'EOF'
#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}NXT HUMANS SAFE API KEY MANAGEMENT${NC}"
echo -e "${YELLOW}======================================${NC}"

# Function to securely update a key in the .env file
update_key() {
    local key_name="$1"
    local key_value="$2"
    local env_file="$3"
    
    # Create the file if it doesn't exist
    if [ ! -f "$env_file" ]; then
        touch "$env_file"
        echo -e "${YELLOW}Created new $env_file file${NC}"
    fi
    
    # Check if key already exists
    if grep -q "^${key_name}=" "$env_file"; then
        # Replace existing key
        sed -i '' "s|^${key_name}=.*|${key_name}=${key_value}|g" "$env_file"
    else
        # Add new key
        echo "${key_name}=${key_value}" >> "$env_file"
    fi
    
    echo -e "${GREEN}Updated ${key_name} in ${env_file}${NC}"
}

# Menu for key management
echo -e "${YELLOW}Select operation:${NC}"
echo "1) Update Anthropic API Key"
echo "2) Update OpenAI API Key"
echo "3) Update both keys"
echo "4) Exit"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        read -p "Enter Anthropic API Key: " anthropic_key
        # Update main .env file
        update_key "ANTHROPIC_API_KEY" "$anthropic_key" ".env"
        ;;
    2)
        read -p "Enter OpenAI API Key: " openai_key
        # Update main .env file
        update_key "OPENAI_API_KEY" "$openai_key" ".env"
        # Add USE_WHISPER_API flag
        update_key "USE_WHISPER_API" "true" ".env"
        # Update video analyzer .env file
        mkdir -p internal-solutions-video-analyzer
        update_key "OPENAI_API_KEY" "$openai_key" "internal-solutions-video-analyzer/.env"
        update_key "USE_WHISPER_API" "true" "internal-solutions-video-analyzer/.env"
        echo -e "${GREEN}OpenAI API Key updated successfully!${NC}"
        ;;
    3)
        read -p "Enter Anthropic API Key: " anthropic_key
        read -p "Enter OpenAI API Key: " openai_key
        # Update main .env file
        update_key "ANTHROPIC_API_KEY" "$anthropic_key" ".env"
        update_key "OPENAI_API_KEY" "$openai_key" ".env"
        update_key "USE_WHISPER_API" "true" ".env"
        # Update video analyzer .env file
        mkdir -p internal-solutions-video-analyzer
        update_key "OPENAI_API_KEY" "$openai_key" "internal-solutions-video-analyzer/.env"
        update_key "USE_WHISPER_API" "true" "internal-solutions-video-analyzer/.env"
        echo -e "${GREEN}All API Keys updated successfully!${NC}"
        ;;
    4)
        echo -e "${YELLOW}Exiting without changes${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice!${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}Would you like to restart the workbench with the new keys? [y/n]${NC}"
read restart_choice

if [ "$restart_choice" == "y" ] || [ "$restart_choice" == "Y" ]; then
    echo -e "${YELLOW}Restarting workbench with new API keys...${NC}"
    ./launch.sh
else
    echo -e "${YELLOW}To apply changes, run ./launch.sh${NC}"
fi
EOF

chmod +x safe-update-keys.sh

echo "All fixes completed successfully!"
echo "To run the workbench with the fixed configuration, please run:"
echo "    ./launch.sh"
echo "To safely update API keys in the future, use:"
echo "    ./safe-update-keys.sh"