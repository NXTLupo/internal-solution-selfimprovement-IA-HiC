#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}FIXING LOGO PATHS IN ALL TEMPLATES${NC}"
echo -e "${BLUE}======================================${NC}"

# Create backup of original files
mkdir -p backups/templates

# Fix Launchpad template
echo -e "${YELLOW}Fixing launchpad template...${NC}"
cp "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/templates/index.html" "backups/templates/launchpad_index.html.bak"
sed -i '' 's|<img src="./static/nxt-humans-logo.png"|<img src="/static/nxt-humans-logo.png"|g' "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/templates/index.html"
echo -e "${GREEN}Launchpad template fixed.${NC}"

# Fix Journey Mapper template
echo -e "${YELLOW}Fixing journey mapper template...${NC}"
cp "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-journeymapper/templates/index.html" "backups/templates/journeymapper_index.html.bak"
sed -i '' 's|<img src="./static/nxt-humans-logo.png"|<img src="/static/nxt-humans-logo.png"|g' "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-journeymapper/templates/index.html"
echo -e "${GREEN}Journey mapper template fixed.${NC}"

# Fix Reddit Ripper template
echo -e "${YELLOW}Fixing reddit ripper template...${NC}"
cp "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-reddit-ripper/templates/index.html" "backups/templates/redditripper_index.html.bak"
sed -i '' 's|<img src="./static/nxt-humans-logo.png"|<img src="/static/nxt-humans-logo.png"|g' "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-reddit-ripper/templates/index.html"
echo -e "${GREEN}Reddit ripper template fixed.${NC}"

# Fix Video Analyzer template
echo -e "${YELLOW}Fixing video analyzer template...${NC}"
cp "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-video-analyzer/static/index.html" "backups/templates/videoanalyzer_index.html.bak"
sed -i '' 's|<img src="./static/nxt-humans-logo.png"|<img src="/static/nxt-humans-logo.png"|g' "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-video-analyzer/static/index.html"
echo -e "${GREEN}Video analyzer template fixed.${NC}"

echo -e "${GREEN}${BOLD}All logo paths have been fixed!${NC}"
echo -e "${YELLOW}Restart all services to apply the changes.${NC}"
echo -e "${YELLOW}Use ./restart-services.sh to restart all services.${NC}"