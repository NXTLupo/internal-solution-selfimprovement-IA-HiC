#!/bin/bash

# Fix NLTK resources for the Social Research Analytics backend
# This script installs all required NLTK resources and ensures they're properly extracted

# ANSI color codes for terminal output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Social Research Backend NLTK Resources Fix ===${NC}"
echo -e "${YELLOW}This script will install and extract all required NLTK resources.${NC}"
echo -e "${YELLOW}The container will NOT be restarted unless necessary.${NC}\n"

# Step 1: Check if all required NLTK resources are already available
echo -e "${BLUE}Step 1: Checking for required NLTK resources...${NC}"
RESOURCES_CHECK=$(docker compose -f docker-compose-all.yml exec social-research-backend python -c "
import nltk.data
resources = {
    'punkt': 'tokenizers/punkt',
    'punkt_tab': 'tokenizers/punkt_tab', 
    'stopwords': 'corpora/stopwords',
    'wordnet': 'corpora/wordnet',
    'omw-1.4': 'corpora/omw-1.4'
}
missing = []
for resource, path in resources.items():
    try:
        nltk.data.find(path)
        print(f'{resource}: Available')
    except LookupError:
        print(f'{resource}: Missing')
        missing.append(resource)
print('SUMMARY: ' + ('All resources available' if not missing else 'Missing: ' + ', '.join(missing)))
")

echo "$RESOURCES_CHECK"

# Step 2: Check if unzip is installed in the container
echo -e "\n${BLUE}Step 2: Checking if unzip is installed...${NC}"
UNZIP_CHECK=$(docker compose -f docker-compose-all.yml exec social-research-backend bash -c "which unzip || echo 'not installed'")

if [[ $UNZIP_CHECK == *"not installed"* ]]; then
    echo -e "${YELLOW}Installing unzip utility...${NC}"
    docker compose -f docker-compose-all.yml exec social-research-backend bash -c "apt-get update && apt-get install -y unzip"
    echo -e "${GREEN}Unzip utility installed.${NC}"
else
    echo -e "${GREEN}Unzip utility already installed.${NC}"
fi

# Step 3: Install and extract all NLTK resources
echo -e "\n${BLUE}Step 3: Installing all NLTK resources...${NC}"
docker compose -f docker-compose-all.yml exec social-research-backend bash -c "
python -c 'import nltk; nltk.download(\"punkt\"); nltk.download(\"punkt_tab\"); nltk.download(\"stopwords\"); nltk.download(\"wordnet\"); nltk.download(\"omw-1.4\")' &&
cd /root/nltk_data/corpora &&
[ -f wordnet.zip ] && [ ! -d wordnet ] && unzip -q wordnet.zip &&
[ -f omw-1.4.zip ] && [ ! -d omw-1.4 ] && unzip -q omw-1.4.zip
"

# Step 4: Verify all resources are now available
echo -e "\n${BLUE}Step 4: Verifying all NLTK resources...${NC}"
FINAL_CHECK=$(docker compose -f docker-compose-all.yml exec social-research-backend python -c "
import nltk.data
resources = {
    'punkt': 'tokenizers/punkt',
    'punkt_tab': 'tokenizers/punkt_tab', 
    'stopwords': 'corpora/stopwords',
    'wordnet': 'corpora/wordnet',
    'omw-1.4': 'corpora/omw-1.4'
}
all_available = True
for resource, path in resources.items():
    try:
        nltk.data.find(path)
        print(f'✅ {resource}: Available')
    except LookupError:
        print(f'❌ {resource}: Missing')
        all_available = False
print('SUMMARY: ' + ('✅ All resources available and properly extracted!' if all_available else '❌ Some resources are still missing'))
")

echo "$FINAL_CHECK"

# Step 5: Check if we need to restart the container
if [[ $RESOURCES_CHECK == *"Missing"* ]] && [[ $FINAL_CHECK == *"All resources available"* ]]; then
    echo -e "\n${BLUE}Step 5: Resources have been fixed. Restarting container...${NC}"
    docker compose -f docker-compose-all.yml restart social-research-backend
    echo -e "${GREEN}Container restarted successfully.${NC}"
elif [[ $FINAL_CHECK == *"Some resources are still missing"* ]]; then
    echo -e "\n${RED}Some resources could not be installed properly. You may need to restart the container manually:${NC}"
    echo -e "${YELLOW}docker compose -f docker-compose-all.yml restart social-research-backend${NC}"
else
    echo -e "\n${GREEN}All resources were already available. No restart needed.${NC}"
fi

echo -e "\n${GREEN}Social Research NLTK resources fix complete!${NC}"