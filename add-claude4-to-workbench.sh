#!/bin/bash

# Add Claude 4 Journey Mapper to the NXT HUMANS AI CX WORKBENCH

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}Adding Claude 4 Journey Mapper to the Workbench${NC}"
echo -e "${YELLOW}===============================================${NC}"

# Check if the Claude 4 Journey Mapper directory exists
if [ ! -d "internal-solutions-claude4-journey-mapper" ]; then
  echo -e "${RED}Error: Claude 4 Journey Mapper directory not found!${NC}"
  echo -e "${YELLOW}Please make sure you've created the Claude 4 Journey Mapper first.${NC}"
  exit 1
fi

# Update the docker-compose-all.override.yml file
echo -e "${YELLOW}Updating docker-compose-all.override.yml...${NC}"
if [ -f "docker-compose-all.override.yml.new" ]; then
  mv docker-compose-all.override.yml.new docker-compose-all.override.yml
  echo -e "${GREEN}Successfully updated docker-compose-all.override.yml${NC}"
else
  echo -e "${RED}Error: docker-compose-all.override.yml.new not found!${NC}"
  exit 1
fi

# Update the launchpad integration
echo -e "${YELLOW}Updating launchpad integration...${NC}"
cd internal-solutions-claude4-journey-mapper
python update-launchpad.py
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Successfully updated launchpad integration${NC}"
  cd ..
else
  echo -e "${RED}Error updating launchpad integration!${NC}"
  cd ..
  exit 1
fi

# Create necessary volume for Claude 4 Journey Mapper
echo -e "${YELLOW}Adding Claude 4 Journey Mapper volume to docker-compose-all.yml...${NC}"
if ! grep -q "claude4-journey-uploads:" docker-compose-all.yml; then
  echo -e "  claude4-journey-uploads:\n    driver: local" >> docker-compose-all.yml
  echo -e "${GREEN}Successfully added Claude 4 Journey Mapper volume${NC}"
else
  echo -e "${YELLOW}Claude 4 Journey Mapper volume already exists in docker-compose-all.yml${NC}"
fi

# Update the launch.sh script to display Claude 4 Journey Mapper
echo -e "${YELLOW}Updating launch.sh to display Claude 4 Journey Mapper...${NC}"
if grep -q "Journey Mapper (Claude 4):" launch.sh; then
  echo -e "${YELLOW}Claude 4 Journey Mapper already added to launch.sh${NC}"
else
  sed -i '' 's/  ${BLUE}Journey Mapper (o3):${NC}       http:\/\/localhost:8090/  ${BLUE}Journey Mapper (o3):${NC}       http:\/\/localhost:8090\n  ${BLUE}Journey Mapper (Claude 4):${NC}  http:\/\/localhost:8095/' launch.sh
  echo -e "${GREEN}Successfully updated launch.sh to display Claude 4 Journey Mapper${NC}"
fi

# Add Claude 4 port to kill_running_processes function in launch.sh
if ! grep -q "kill_port 8095" launch.sh; then
  sed -i '' 's/kill_port 8090  # OpenAI Journey Mapper/kill_port 8090  # OpenAI Journey Mapper\n  kill_port 8095  # Claude 4 Journey Mapper/' launch.sh
  sed -i '' 's/kill_port 8505  # OpenAI Journey MCP/kill_port 8505  # OpenAI Journey MCP\n  kill_port 8506  # Claude 4 Journey MCP/' launch.sh
  echo -e "${GREEN}Successfully added Claude 4 ports to launch.sh${NC}"
fi

echo -e "\n${GREEN}${BOLD}Claude 4 Journey Mapper has been added to the workbench!${NC}"
echo -e "${YELLOW}To see the changes, restart the workbench with:${NC}"
echo -e "  ${BLUE}./launch.sh${NC}"
echo -e "${YELLOW}The Claude 4 Journey Mapper will be available at:${NC}"
echo -e "  ${BLUE}http://localhost:8095${NC}"