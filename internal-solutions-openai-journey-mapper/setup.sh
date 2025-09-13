#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up OpenAI Journey Mapper environment...${NC}"

# Check if Python is installed
python3 --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Python 3 is not installed!${NC}"
  exit 1
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo -e "${YELLOW}Creating virtual environment...${NC}"
  python3 -m venv venv
else
  echo -e "${GREEN}Virtual environment already exists.${NC}"
fi

# Activate the virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Create needed directories
echo -e "${YELLOW}Creating required directories...${NC}"
mkdir -p logs uploads journey_maps static templates

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}Creating .env file...${NC}"
  
  # Try to get API key from parent directory
  PARENT_ENV="../.env"
  if [ -f "$PARENT_ENV" ]; then
    OPENAI_API_KEY=$(grep "OPENAI_API_KEY" "$PARENT_ENV" | cut -d '=' -f2)
    if [ -n "$OPENAI_API_KEY" ]; then
      echo "OPENAI_API_KEY=$OPENAI_API_KEY" > .env
      echo "OPENAI_MODEL=o3" >> .env
      echo "REASONING_EFFORT=medium" >> .env
      echo -e "${GREEN}Created .env file with API key from parent directory.${NC}"
    else
      echo -e "${RED}Could not find OPENAI_API_KEY in parent .env file.${NC}"
      echo -e "${YELLOW}Please enter your OpenAI API key:${NC}"
      read -s api_key
      echo "OPENAI_API_KEY=$api_key" > .env
      echo "OPENAI_MODEL=o3" >> .env
      echo "REASONING_EFFORT=medium" >> .env
      echo -e "${GREEN}Created .env file with provided API key.${NC}"
    fi
  else
    echo -e "${YELLOW}No parent .env file found. Please enter your OpenAI API key:${NC}"
    read -s api_key
    echo "OPENAI_API_KEY=$api_key" > .env
    echo "OPENAI_MODEL=o3" >> .env
    echo "REASONING_EFFORT=medium" >> .env
    echo -e "${GREEN}Created .env file with provided API key.${NC}"
  fi
else
  echo -e "${GREEN}.env file already exists.${NC}"
fi

# Create a dummy CSS file if needed
if [ ! -f "static/journey_export.js" ]; then
  echo -e "${YELLOW}Creating basic static files...${NC}"
  cat > static/journey_export.js << EOF
// Journey Export Functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('Journey export functionality loaded');
  
  // Add export button if it doesn't exist
  if (!document.getElementById('export-pdf-button')) {
    const exportButton = document.createElement('button');
    exportButton.id = 'export-pdf-button';
    exportButton.innerText = 'Export to PDF';
    exportButton.style.position = 'fixed';
    exportButton.style.bottom = '20px';
    exportButton.style.right = '20px';
    exportButton.style.padding = '10px 15px';
    exportButton.style.backgroundColor = '#4264D0';
    exportButton.style.color = 'white';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '4px';
    exportButton.style.cursor = 'pointer';
    exportButton.style.zIndex = '1000';
    
    exportButton.addEventListener('click', function() {
      const journeyId = window.location.pathname.split('/').pop().replace('.html', '').replace('journey_map_', '');
      window.location.href = '/api/export-pdf/' + journeyId;
    });
    
    document.body.appendChild(exportButton);
  }
});
EOF
  echo -e "${GREEN}Created basic static files.${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}To run the OpenAI Journey Mapper, use:${NC}"
echo -e "${GREEN}python run.py${NC}"