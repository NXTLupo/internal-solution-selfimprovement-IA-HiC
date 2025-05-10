#!/bin/bash

# Setup script for Journey Mapper local development
# This script installs the necessary dependencies for running
# Journey Mapper without Docker

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_banner() {
  echo -e "${BLUE}"
  echo "Journey Mapper Setup"
  echo "===================="
  echo -e "${NC}"
}

print_banner

# Get OS type
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="mac"
    echo -e "${BLUE}Detected macOS system${NC}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
    echo -e "${BLUE}Detected Linux system${NC}"
else
    OS_TYPE="other"
    echo -e "${BLUE}Detected other system: $OSTYPE${NC}"
fi

# Check Python version
echo -e "${BLUE}Checking Python version...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

PYTHON_VERSION=$($PYTHON_CMD --version | awk '{print $2}')
echo -e "${GREEN}Found Python $PYTHON_VERSION${NC}"

# Check if Python version meets requirements (>=3.9)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 9 ]); then
    echo -e "${RED}Error: Python 3.9 or higher is required.${NC}"
    echo -e "${YELLOW}Please install Python 3.9+ and try again.${NC}"
    exit 1
fi

# Handle macOS specific setup
if [ "$OS_TYPE" = "mac" ]; then
    echo -e "${BLUE}Setting up macOS environment...${NC}"
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo -e "${YELLOW}Homebrew not found. Installing Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Check architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        echo -e "${YELLOW}Detected Apple Silicon (M1/M2/M3)${NC}"
        echo -e "${BLUE}Installing dependencies for Apple Silicon...${NC}"
        
        # Install dependencies
        brew install cmake pkg-config wkhtmltopdf
        
        # For Apple Silicon, use miniforge instead of regular pip for better compatibility
        if ! command -v conda &> /dev/null; then
            echo -e "${YELLOW}Conda not found. Installing Miniforge for better Apple Silicon compatibility...${NC}"
            brew install --cask miniforge
            
            # Initialize conda
            conda init bash
            source ~/.bash_profile
            
            # Create environment
            conda create -n journey-mapper python=3.10 -y
            conda activate journey-mapper
            
            # Install essential packages through conda
            conda install -c conda-forge numpy pandas scikit-learn spacy -y
        fi
    else
        echo -e "${BLUE}Detected Intel Mac${NC}"
        brew install cmake pkg-config wkhtmltopdf
    fi
    
    # If using M1/M2/M3, suggest using Docker for better compatibility
    if [ "$ARCH" = "arm64" ]; then
        echo -e "${YELLOW}NOTE: For Apple Silicon (M1/M2/M3) Macs, using Docker is strongly recommended${NC}"
        echo -e "${YELLOW}for better compatibility with C extensions.${NC}"
    fi
    
# Handle Linux specific setup
elif [ "$OS_TYPE" = "linux" ]; then
    echo -e "${BLUE}Setting up Linux environment...${NC}"
    
    # Check if user has sudo access
    if command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        SUDO=""
        echo -e "${YELLOW}Warning: sudo not found. Will attempt to install without sudo.${NC}"
    fi
    
    # Install system dependencies
    echo -e "${BLUE}Installing system dependencies...${NC}"
    $SUDO apt-get update
    $SUDO apt-get install -y build-essential python3-dev libpq-dev git curl make wget wkhtmltopdf xvfb
    
    # Create xvfb wrapper for wkhtmltopdf on headless servers
    echo -e "${BLUE}Creating xvfb wrapper for wkhtmltopdf...${NC}"
    echo '#!/bin/bash
xvfb-run -a --server-args="-screen 0 1280x1024x24" /usr/bin/wkhtmltopdf "$@"' | $SUDO tee /usr/local/bin/wkhtmltopdf-xvfb > /dev/null
    $SUDO chmod +x /usr/local/bin/wkhtmltopdf-xvfb
fi

# Setup Python virtual environment
echo -e "${BLUE}Setting up Python virtual environment...${NC}"
cd "$(dirname "$0")/internal-solutions-journeymapper"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating virtual environment...${NC}"
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
if [ "$OS_TYPE" = "mac" ] || [ "$OS_TYPE" = "linux" ]; then
    source venv/bin/activate
else
    source venv/Scripts/activate
fi

# Upgrade pip and install dependencies
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${YELLOW}To run the Journey Mapper:${NC}"
echo -e "  cd internal-solutions-journeymapper"
echo -e "  source venv/bin/activate  # Activate the virtual environment"
echo -e "  python run.py             # Start the application"
echo ""
echo -e "${YELLOW}NOTE: Make sure to set your Anthropic API key:${NC}"
echo -e "  export ANTHROPIC_API_KEY=your_api_key_here"
echo ""
echo -e "${GREEN}Happy journey mapping!${NC}"