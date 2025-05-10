# Journey Mapper

## Overview

AI Journey Mapper is a powerful tool for generating interactive customer journey maps from various data sources using Claude 3.7 Sonnet LLM. This component provides multi-format data processing, advanced two-stage AI analysis, and interactive visualizations.

## Requirements

- Python 3.9+ (Python 3.10 recommended)
- Anthropic API Key with access to Claude 3.7 Sonnet
- System dependencies:
  - build-essential (for C extensions)
  - python3-dev
  - wkhtmltopdf (for PDF generation)
  - xvfb (for headless PDF generation)

## Installation

### Option 1: Using Docker (Recommended)

The enhanced Dockerfile includes all necessary dependencies for both regular systems and Apple Silicon Macs:

```bash
# Build the Docker image
docker build -f Dockerfile.enhanced -t journey-mapper .

# Run the container
docker run -p 8080:8000 -e ANTHROPIC_API_KEY=your_key_here journey-mapper
```

### Option 2: Using setup script

We've provided a setup script to handle different OS environments:

```bash
# From the root directory
./setup-journey-mapper.sh

# Then run the application
cd internal-solutions-journeymapper
source venv/bin/activate
python run.py
```

### Option 3: Manual installation

For macOS:
```bash
# Install system dependencies
brew install cmake pkg-config wkhtmltopdf

# For Apple Silicon (M1/M2/M3) Macs
# Consider using conda for better compatibility
brew install --cask miniforge
conda create -n journey-mapper python=3.10 -y
conda activate journey-mapper
conda install -c conda-forge numpy pandas scikit-learn spacy -y

# Install Python requirements
pip install -r requirements.txt
```

For Linux:
```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y build-essential python3-dev libpq-dev git curl wkhtmltopdf xvfb

# Create virtual environment
python -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

## Running the Application

```bash
# Set your API key
export ANTHROPIC_API_KEY=your_api_key_here

# Start the application
python run.py
```

The application will automatically:
1. Find an available port (default: 8080, 5000, 3000, or 9000)
2. Create necessary directories (uploads, journey_maps, logs)
3. Start the FastAPI server

## Features

- Multi-format data processing (PDF, CSV, TXT)
- Two-stage AI analysis with Claude 3.7 Sonnet
- Interactive HTML journey maps
- PDF export capabilities
- Structured journey elements (stages, touchpoints, pain points, emotions)

## Troubleshooting

### Common Issues

1. **C Extensions Build Failures**
   - Make sure build-essential and python3-dev are installed
   - For Apple Silicon Macs, consider using conda or Docker

2. **wkhtmltopdf Issues**
   - Install wkhtmltopdf manually: `sudo apt-get install wkhtmltopdf xvfb`
   - For headless servers, use the xvfb wrapper

3. **API Key Issues**
   - Set the ANTHROPIC_API_KEY environment variable
   - Ensure you have access to Claude 3.7 Sonnet

4. **Port Conflicts**
   - The application will automatically try different ports
   - Or specify a port with the PORT environment variable

## Special Notes for Apple Silicon (M1/M2/M3) Macs

Some Python packages with C extensions can be challenging on Apple Silicon:

1. Use the enhanced Dockerfile which handles these challenges
2. Consider using Miniforge/conda instead of pip
3. Some packages (like faiss-cpu) are conditionally skipped on ARM Macs

## License

Internal use only. Copyright © 2025 NXT Humans.