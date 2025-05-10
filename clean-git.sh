#!/bin/bash

# Script to clean up git repository with macOS issues
# This script will create a clean clone without the problematic zip files

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== NXT HUMANS AI CX WORKBENCH - Git Cleanup Script ===${NC}"
echo -e "${YELLOW}This script will create a clean copy of your repository without the large files${NC}"
echo ""

# Get the current directory
REPO_DIR="$(pwd)"
TEMP_DIR="$HOME/NXT_HUMANS_CLEAN_TEMP"

echo -e "${BLUE}Current directory: ${REPO_DIR}${NC}"
echo -e "${BLUE}Will create clean repo at: ${TEMP_DIR}${NC}"
echo ""

# Make sure we don't overwrite an existing directory
if [ -d "$TEMP_DIR" ]; then
  echo -e "${YELLOW}Temporary directory already exists. Removing it...${NC}"
  rm -rf "$TEMP_DIR"
fi

# Create a fresh directory
mkdir -p "$TEMP_DIR"

echo -e "${BLUE}Cloning only the current working tree without history...${NC}"
echo -e "${YELLOW}This will avoid the problematic large files in history.${NC}"

# Create a .gitignore file to exclude the large zip files
echo -e "${BLUE}Creating .gitignore to exclude large files...${NC}"
if [ ! -f .gitignore ]; then
  touch .gitignore
fi

# Make sure the large files are in .gitignore
if ! grep -q "internal-solutions-journeymapper.zip" .gitignore; then
  echo "internal-solutions-journeymapper.zip" >> .gitignore
fi
if ! grep -q "frontend_files.zip" .gitignore; then
  echo "frontend_files.zip" >> .gitignore
fi

# List files that will be copied
echo -e "${BLUE}Will copy these files to the clean repository:${NC}"
find . -type f -not -path "./.git/*" -not -path "./internal-solutions-journeymapper.zip" -not -path "./frontend_files.zip" | head -20
echo -e "${YELLOW}... and more${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}This will create a new clean repository at $TEMP_DIR${NC}"
echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel${NC}"
read

# Copy all files except .git and the large zip files
echo -e "${BLUE}Copying files to clean directory...${NC}"
rsync -a --exclude='.git/' --exclude='internal-solutions-journeymapper.zip' --exclude='frontend_files.zip' "$REPO_DIR/" "$TEMP_DIR/"

# Initialize git in the new directory
echo -e "${BLUE}Initializing new git repository...${NC}"
cd "$TEMP_DIR"
git init
git branch -m main  # Rename the initial branch to main
git add .
git commit -m "Initial commit with clean files (no large zip files)"

# Add the remote
echo -e "${BLUE}Adding GitHub remote...${NC}"
git remote add origin https://github.com/NXTLupo/NXT-HUMANS_AI_CX_WORKBENCH.git

echo -e "${GREEN}Clean repository created successfully at: ${TEMP_DIR}${NC}"
echo ""
echo -e "${YELLOW}To push to GitHub, do:${NC}"
echo -e "  cd ${TEMP_DIR}"
echo -e "  git push -f origin main"
echo ""
echo -e "${RED}Warning: This will force push and overwrite your GitHub repository!${NC}"
echo -e "${RED}Only do this if you're sure you want to replace what's on GitHub.${NC}"
echo ""
echo -e "${BLUE}After pushing, you can continue working in the clean repository.${NC}"