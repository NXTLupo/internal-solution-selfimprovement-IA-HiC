#!/bin/bash
# Setup Git LFS for the NXT HUMANS AI CX WORKBENCH

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Setting up Git LFS for NXT HUMANS AI CX WORKBENCH ===${NC}"

# Check if Git LFS is installed
if ! command -v git-lfs &> /dev/null; then
    echo -e "${RED}Git LFS is not installed!${NC}"
    
    # Check OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo -e "${YELLOW}Installing Git LFS using Homebrew...${NC}"
        if ! command -v brew &> /dev/null; then
            echo -e "${RED}Homebrew is not installed. Please install it first:${NC}"
            echo -e "${BLUE}/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
            exit 1
        fi
        brew install git-lfs
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo -e "${YELLOW}Installing Git LFS using apt...${NC}"
        sudo apt-get update
        sudo apt-get install -y git-lfs
    else
        echo -e "${RED}Unsupported OS. Please install Git LFS manually:${NC}"
        echo -e "${BLUE}https://git-lfs.github.com/${NC}"
        exit 1
    fi
fi

# Initialize Git LFS
echo -e "${BLUE}Initializing Git LFS...${NC}"
git lfs install

# Track large files
echo -e "${BLUE}Configuring Git LFS to track large files...${NC}"
git lfs track "*.zip"
git lfs track "*.pdf"
git lfs track "*.model"
git lfs track "*.data"
git lfs track "*.h5"
git lfs track "*.pkl"
git lfs track "*.bin"
git lfs track "*.jpg"
git lfs track "*.png"
git lfs track "*.mp4"

# Add .gitattributes to git
git add .gitattributes

# Commit the changes
git commit -m "Configure Git LFS for large files"

echo -e "${GREEN}Git LFS has been set up successfully!${NC}"
echo -e "${YELLOW}The following file types will be tracked with Git LFS:${NC}"
cat .gitattributes

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Add your remote repository:"
echo -e "   ${GREEN}git remote add origin https://github.com/yourusername/nxt-humans-ai-cx-workbench.git${NC}"
echo -e "2. Push your code to GitHub:"
echo -e "   ${GREEN}git push -u origin main${NC}"
echo -e "\n${YELLOW}Note: When pushing for the first time, Git LFS will upload all tracked files.${NC}"
echo -e "${YELLOW}This may take some time depending on the size of your repository.${NC}"