# Journey Mapper Dependencies Guide

This guide provides detailed information about the dependencies required for the Journey Mapper component and how to handle C extension installation issues.

## Background

The Journey Mapper service relies on several Python packages that require C compilation during installation:

- **faiss-cpu**: Vector search library
- **annoy**: Approximate nearest neighbors library
- **spacy**: NLP library with C components
- **scikit-learn**: Machine learning library with C components

Additionally, PDF generation requires:
- **wkhtmltopdf**: HTML to PDF conversion utility
- **xvfb**: X virtual framebuffer (for headless servers)

## Solution Overview

I've implemented the following solutions to address these dependencies:

1. **Enhanced Docker Configuration**: Updated docker-compose.yml and dynamic-compose.yml files
2. **Enhanced Dockerfile**: Created Dockerfile.enhanced with all necessary dependencies
3. **Setup Script**: Added setup-journey-mapper.sh for local development
4. **Updated Documentation**: Modified CLAUDE.md with improved instructions

## Docker-based Solution

The updated Docker configuration includes:

```yaml
journey-mapper:
  image: python:3.10-slim
  ports:
    - "${JOURNEY_MAPPER_PORT:-8080}:8000"
  environment:
    - ANTHROPIC_API_KEY=your_key_here
    - PORT=8000
    - ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
  volumes:
    - ./internal-solutions-journeymapper:/app
  working_dir: /app
  command: >
    bash -c "apt-get update && apt-get install -y build-essential python3-dev wkhtmltopdf xvfb libpq-dev git curl make &&
            pip install --no-cache-dir --upgrade pip setuptools wheel &&
            pip install --no-cache-dir -r requirements.txt &&
            mkdir -p logs uploads journey_maps &&
            python run.py"
  networks:
    - nxt-humans-network
```

Key changes:
- Python 3.10 instead of 3.9 for better compatibility
- Additional dependencies (python3-dev, wkhtmltopdf, xvfb)
- Directory creation to ensure proper structure
- Corrected path from internal-solutions-journey-mapper to internal-solutions-journeymapper

## OS-Specific Solutions

### macOS (Intel)

```bash
# Install required tools
brew install cmake pkg-config wkhtmltopdf

# Setup Python environment
python -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### macOS (Apple Silicon - M1/M2/M3)

```bash
# Install required tools
brew install cmake pkg-config wkhtmltopdf

# Option 1: Use conda (recommended)
brew install --cask miniforge
conda create -n journey-mapper python=3.10 -y
conda activate journey-mapper
conda install -c conda-forge numpy pandas scikit-learn spacy -y
pip install -r requirements.txt

# Option 2: Use Docker (more reliable)
docker build -f Dockerfile.enhanced -t journey-mapper .
docker run -p 8080:8000 -e ANTHROPIC_API_KEY=your_key_here journey-mapper
```

### Linux (Ubuntu/Debian)

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y build-essential python3-dev libpq-dev git curl make wget wkhtmltopdf xvfb

# Create xvfb wrapper for wkhtmltopdf (for headless servers)
echo '#!/bin/bash
xvfb-run -a --server-args="-screen 0 1280x1024x24" /usr/bin/wkhtmltopdf "$@"' | sudo tee /usr/local/bin/wkhtmltopdf-xvfb > /dev/null
sudo chmod +x /usr/local/bin/wkhtmltopdf-xvfb

# Setup Python environment
python -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

## Enhanced Dockerfile Explanation

The enhanced Dockerfile includes:

1. **Base image**: Python 3.10 slim
2. **System dependencies**: Complete set of required packages
3. **Xvfb wrapper**: For headless PDF generation
4. **Directory creation**: Ensures all required paths exist
5. **Dependency installation**: Properly handles difficult packages

See `Dockerfile.enhanced` for the complete implementation.

## Detailed Package Information

### faiss-cpu

Purpose: Fast similarity search and clustering of dense vectors

Issues:
- Requires C++11 compiler
- Uses BLAS libraries
- Challenging on Apple Silicon

Solution:
- Conditionally installed based on platform
- Alternative: Use `annoy` library on Apple Silicon

### annoy

Purpose: Approximate Nearest Neighbors Oh Yeah

Issues:
- Requires C++ compilation
- Uses memory-mapped files

Solution:
- Proper build tools installation
- Fall back to pure Python alternatives if needed

### spacy

Purpose: Advanced NLP library

Issues:
- Cython components
- Multiple C extensions

Solution:
- Install build-essential and python3-dev
- Use conda for Apple Silicon

### wkhtmltopdf

Purpose: HTML to PDF conversion

Issues:
- X11 requirements on headless servers
- QT dependencies

Solution:
- Install wkhtmltopdf and xvfb
- Create xvfb wrapper script for headless servers

## Automated Setup Script

The setup-journey-mapper.sh script automates:

1. OS detection (macOS, Linux)
2. Architecture detection (Intel, Apple Silicon)
3. Installation of appropriate dependencies
4. Virtual environment setup
5. Package installation with proper flags

This script provides a seamless experience for developers across different platforms.

## Going Forward

To maintain this solution:

1. Keep `requirements.txt` updated with proper version constraints
2. Test regularly on different platforms (especially Apple Silicon)
3. Consider moving to conda-based environment for better cross-platform support
4. Update Docker images when Python or dependency versions change

## Links to Resources

- [faiss Documentation](https://github.com/facebookresearch/faiss)
- [annoy Documentation](https://github.com/spotify/annoy)
- [spacy Installation Guide](https://spacy.io/usage)
- [wkhtmltopdf Documentation](https://wkhtmltopdf.org/)