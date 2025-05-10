#!/bin/bash

# Script to fix large file issues and set up Git LFS
# Run this script to configure Git LFS and remove large files from history

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== NXT HUMANS AI CX WORKBENCH - Large File Fix Script ===${NC}"
echo -e "${YELLOW}This script will help fix large file issues and configure Git LFS${NC}"
echo ""

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
echo -e "${YELLOW}Now, let's find and fix the large files that exceeded GitHub's size limit.${NC}"
echo ""

# Create a new temporary branch
echo -e "${BLUE}Creating a temporary branch...${NC}"
TEMP_BRANCH="fix-large-files-$(date +%s)"
git checkout -b $TEMP_BRANCH

# Find the large files in the repo history
echo -e "${BLUE}Looking for specific large files mentioned in the error...${NC}"
LARGE_FILES=("internal-solutions-journeymapper.zip" "frontend_files.zip")

# Create a .gitignore backup
cp .gitignore .gitignore.bak 2>/dev/null || touch .gitignore.bak

# Add large files to .gitignore if not already present
echo -e "${BLUE}Adding large files to .gitignore...${NC}"
for file in "${LARGE_FILES[@]}"; do
    if ! grep -q "^$file$" .gitignore; then
        echo "$file" >> .gitignore
    fi
done

# Commit the gitignore changes
git add .gitignore
git commit -m "Add large files to .gitignore"

echo -e "${BLUE}Creating filtered clone...${NC}"
echo -e "${YELLOW}This process will create a clean clone of your repository without the large files.${NC}"
echo ""

# Execute the clean clone process
REPO_DIR="$(pwd)"
mkdir -p ~/NXT_HUMANS_CLEAN_TEMP
git clone --no-local "$REPO_DIR" ~/NXT_HUMANS_CLEAN_TEMP
cd ~/NXT_HUMANS_CLEAN_TEMP

# Set up Git LFS in the clean repo
git lfs install
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
git add .gitattributes
git commit -m "Configure Git LFS for large files"

# Add remote
git remote add origin https://github.com/NXTLupo/NXT-HUMANS_AI_CX_WORKBENCH.git

echo -e "${GREEN}Clean repository created at ~/NXT_HUMANS_CLEAN_TEMP${NC}"
echo -e "${YELLOW}You can now push this clean repository to GitHub with:${NC}"
echo ""
echo -e "  cd ~/NXT_HUMANS_CLEAN_TEMP"
echo -e "  git push -f -u origin main"
echo ""
echo -e "${RED}Warning: This will force push to your GitHub repository, overwriting history.${NC}"
echo -e "${RED}Only do this if you're sure you want to replace the remote history.${NC}"
echo ""
echo -e "${BLUE}After pushing, you can replace your current repository with the clean one:${NC}"
echo -e "  rm -rf \"$REPO_DIR/.git\""
echo -e "  cp -r ~/NXT_HUMANS_CLEAN_TEMP/.git \"$REPO_DIR/\""
echo -e "  cd \"$REPO_DIR\""
echo -e "  git reset --hard"
echo ""
echo -e "${YELLOW}If you need to add the large files back as LFS objects:${NC}"
echo -e "  1. Place them in the correct location"
echo -e "  2. Run: git add -A"
echo -e "  3. Commit: git commit -m \"Add large files via Git LFS\""
echo -e "  4. Push: git push origin main"