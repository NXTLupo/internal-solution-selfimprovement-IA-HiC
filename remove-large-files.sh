#!/bin/bash

# Script to permanently remove large files from Git history
# Warning: This will rewrite Git history

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}WARNING: This script will permanently rewrite Git history!${NC}"
echo -e "${YELLOW}It will remove the large zip files that are preventing GitHub pushes.${NC}"
echo -e "${YELLOW}Make sure you have a backup of your repository before proceeding.${NC}"
echo ""
echo -e "${BLUE}Press Enter to continue or Ctrl+C to abort...${NC}"
read

# Save the current directory
REPO_DIR="$(pwd)"

echo -e "${BLUE}Starting large file removal process...${NC}"

# Create a fresh clone to work with (safer than modifying the current repo)
echo -e "${BLUE}Creating a temporary working directory...${NC}"
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo -e "${BLUE}Cloning the repository...${NC}"
git clone --no-local "$REPO_DIR" .

# Use BFG Repo-Cleaner if available, otherwise fall back to git-filter-repo
if command -v bfg &> /dev/null; then
    echo -e "${BLUE}Using BFG Repo-Cleaner to remove large files...${NC}"
    
    # Install BFG if needed (depends on Java)
    java -jar $(which bfg) --delete-files "internal-solutions-journeymapper.zip" .
    java -jar $(which bfg) --delete-files "frontend_files.zip" .
    
    # Clean up
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    
elif command -v git-filter-repo &> /dev/null; then
    echo -e "${BLUE}Using git-filter-repo to remove large files...${NC}"
    
    # Remove the files using git-filter-repo
    git filter-repo --path internal-solutions-journeymapper.zip --invert-paths
    git filter-repo --path frontend_files.zip --invert-paths
    
else
    echo -e "${BLUE}Using git filter-branch to remove large files...${NC}"
    
    # Remove the large files from history using filter-branch
    git filter-branch --force --index-filter \
      "git rm --cached --ignore-unmatch internal-solutions-journeymapper.zip frontend_files.zip" \
      --prune-empty --tag-name-filter cat -- --all
    
    # Clean up
    git for-each-ref --format="delete %(refname)" refs/original/ | git update-ref --stdin
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
fi

# Create a .gitignore to prevent re-adding these files
if [ ! -f .gitignore ]; then
    touch .gitignore
fi

# Add the files to .gitignore if not already there
if ! grep -q "internal-solutions-journeymapper.zip" .gitignore; then
    echo "internal-solutions-journeymapper.zip" >> .gitignore
fi

if ! grep -q "frontend_files.zip" .gitignore; then
    echo "frontend_files.zip" >> .gitignore
fi

# Commit the .gitignore changes
git add .gitignore
git commit -m "Add large files to .gitignore to prevent re-adding them"

echo -e "${GREEN}Large files have been removed from Git history!${NC}"
echo ""
echo -e "${BLUE}Now replacing the original repository with the cleaned one...${NC}"

# Replace the original repository with the cleaned one
cd "$REPO_DIR"
echo -e "${BLUE}Updating remote URL for the cleaned repository...${NC}"
cd "$TEMP_DIR"
git remote set-url origin https://github.com/NXTLupo/NXT-HUMANS_AI_CX_WORKBENCH.git

echo -e "${GREEN}Clean repository created successfully!${NC}"
echo -e "${YELLOW}Here's what to do next:${NC}"
echo ""
echo -e "1. Navigate to the clean repository:"
echo -e "   ${GREEN}cd $TEMP_DIR${NC}"
echo ""
echo -e "2. Push the clean repository to GitHub (force push required):"
echo -e "   ${GREEN}git push -f origin main${NC}"
echo ""
echo -e "3. Replace your current repo with the clean one or clone from GitHub:"
echo -e "   ${YELLOW}Option A: Replace current repo${NC}"
echo -e "   ${GREEN}rm -rf \"$REPO_DIR/.git\"${NC}"
echo -e "   ${GREEN}cp -r \"$TEMP_DIR/.git\" \"$REPO_DIR/\"${NC}"
echo -e "   ${GREEN}cd \"$REPO_DIR\"${NC}"
echo -e "   ${GREEN}git reset --hard${NC}"
echo ""
echo -e "   ${YELLOW}Option B: Fresh clone from GitHub${NC}"
echo -e "   ${GREEN}cd /somewhere/else${NC}"
echo -e "   ${GREEN}git clone https://github.com/NXTLupo/NXT-HUMANS_AI_CX_WORKBENCH.git${NC}"
echo ""
echo -e "${BLUE}Cleaned repository location: ${TEMP_DIR}${NC}"
echo -e "${RED}Warning: The temporary directory will be deleted on system reboot.${NC}"
echo -e "${RED}Make sure to push your changes or save the directory if needed.${NC}"