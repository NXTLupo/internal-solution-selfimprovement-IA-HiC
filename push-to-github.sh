#!/bin/bash

# Script to fix Git repo issues and push to GitHub
# Run this script from your local terminal

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== NXT HUMANS AI CX WORKBENCH - Fix & Push Script ===${NC}"
echo -e "${YELLOW}This script will fix Git repository issues and push to GitHub${NC}"
echo ""

# Get the current directory
REPO_DIR="$(pwd)"
echo -e "${BLUE}Current directory: ${REPO_DIR}${NC}"
echo ""

# Clean up macOS metadata files
echo -e "${BLUE}Cleaning up macOS metadata files...${NC}"
find . -name "._*" -type f -delete
find .git -name "._*" -type f -delete
echo -e "${GREEN}Cleanup complete${NC}"
echo ""

# Force Git to reset internal index
echo -e "${BLUE}Resetting Git index...${NC}"
rm -f .git/index
git reset
echo -e "${GREEN}Git index reset complete${NC}"
echo ""

# Verify remote configuration
echo -e "${BLUE}Verifying remote configuration...${NC}"
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "none")

if [ "$REMOTE_URL" == "none" ]; then
    echo -e "${YELLOW}No remote 'origin' configured. Adding it now...${NC}"
    git remote add origin https://github.com/NXTLupo/NXT-HUMANS_AI_CX_WORKBENCH.git
    echo -e "${GREEN}Remote 'origin' added${NC}"
else
    echo -e "${GREEN}Remote 'origin' is already configured as: ${REMOTE_URL}${NC}"
fi
echo ""

# Push to GitHub
echo -e "${BLUE}Attempting to push to GitHub...${NC}"
echo -e "${YELLOW}This may require authentication. Enter your GitHub credentials when prompted.${NC}"
echo ""

git push -u origin main

# Check if push was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Successfully pushed to GitHub!${NC}"
    echo -e "${GREEN}Repository URL: https://github.com/NXTLupo/NXT-HUMANS_AI_CX_WORKBENCH${NC}"
else
    echo ""
    echo -e "${RED}Failed to push to GitHub.${NC}"
    echo -e "${YELLOW}Alternative method: Clone to local directory and push:${NC}"
    echo ""
    echo "  mkdir -p ~/NXT_HUMANS_CLEAN"
    echo "  git clone --no-local \"$REPO_DIR\" ~/NXT_HUMANS_CLEAN"
    echo "  cd ~/NXT_HUMANS_CLEAN"
    echo "  git remote add origin https://github.com/NXTLupo/NXT-HUMANS_AI_CX_WORKBENCH.git"
    echo "  git push -u origin main"
    echo ""
fi