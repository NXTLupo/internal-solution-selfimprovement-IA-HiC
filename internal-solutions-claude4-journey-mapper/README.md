# Claude 4 Journey Mapper

A customer journey mapping application powered by Anthropic's Claude 4 model.

## Overview

This application creates interactive, data-driven customer journey maps using Anthropic's Claude 4 Sonnet model (`claude-sonnet-4-20250514`). It allows you to upload various data formats and receive visually appealing, interactive HTML-based journey maps.

## Features

- Upload multiple file formats (CSV, TXT, PDF, JSON)
- Intelligent data processing and structure detection
- Advanced journey mapping with Claude 4's enhanced reasoning
- Interactive HTML output with responsive design
- PDF export functionality
- Handling for Claude 4's refusal stop reason
- Support for interleaved thinking

## Getting Started

### Prerequisites

- Python 3.8+
- Anthropic API key with access to Claude 4 models

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd internal-solutions-claude4-journey-mapper
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

### Running the application

```bash
python run.py
```

The application will automatically choose an available port and start the server. By default, it will try port 8090 first, and then fall back to 8888, 9090, or 9000 if necessary.

### Using Docker

You can also run the application using Docker:

```bash
# Build and run using docker-compose
docker compose up -d

# Or build and run manually
docker build -f Dockerfile.enhanced -t claude4-journey-mapper .
docker run -p 8090:8000 -e ANTHROPIC_API_KEY=your_key_here claude4-journey-mapper
```

## Usage

1. Navigate to the application in your web browser (default: http://localhost:8090)
2. Upload your data files (CSV, TXT, PDF, JSON)
3. Optionally customize the journey title and description
4. Click "Generate Journey Map"
5. View the interactive journey map in your browser
6. Use the export button to save as PDF if needed

## Differences from Claude 3.7 Journey Mapper

This implementation includes several enhancements for Claude 4:

1. Updated model ID to `claude-sonnet-4-20250514`
2. Handling for Claude 4's refusal stop reason
3. Support for interleaved thinking 
4. Updated text editor tool type
5. Removal of token-efficient tool use and extended output formats
6. Enhanced system prompt for Claude 4's capabilities

## Technical Details

The application is built with:
- FastAPI for the web server
- Anthropic's Claude 4 API for journey mapping generation
- JavaScript for interactive elements
- HTML/CSS for the responsive user interface

## License

[License information]