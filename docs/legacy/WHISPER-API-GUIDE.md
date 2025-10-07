# OpenAI Whisper API Integration Guide

This guide explains how to use the OpenAI Whisper API integration for the video analyzer service in the NXT HUMANS AI CX WORKBENCH.

## Overview

The video analyzer service can use either:
1. **Local Whisper Model**: Runs on your machine but requires more resources
2. **OpenAI Whisper API**: Uses OpenAI's cloud-based transcription service for better performance

## Setup Instructions

### 1. Prerequisites

- An OpenAI API key with access to the Whisper API
- Python 3.9 or later
- Docker (if running with Docker)

### 2. Installation

Run the setup script to install the required dependencies and test your API key:

```bash
./setup_whisper_api.sh
```

This script will:
- Install the required Python packages
- Check your OpenAI API key in the `.env` file
- Create a test audio file
- Test the OpenAI Whisper API connection

### 3. Configuration

The following environment variables control the Whisper API integration:

- `OPENAI_API_KEY`: Your OpenAI API key
- `USE_WHISPER_API`: Set to `true` to use the OpenAI Whisper API instead of the local model

These can be set in the `.env` file in the root directory of the project.

### 4. Testing

To test the OpenAI Whisper API integration:

```bash
# Test with environment variables from .env
./test-with-env.sh

# Direct API test
python test_openai_api.py
```

### 5. Starting the Video Analyzer with OpenAI Whisper API

To start the video analyzer service with the OpenAI Whisper API:

```bash
# Update the video analyzer service with OpenAI Whisper API
./update_video_service.sh

# Alternatively, start all services including video analyzer
./start-with-video.sh
```

## Troubleshooting

### API Key Issues

If you encounter issues with the API key:

1. Make sure your OpenAI API key is valid and has access to the Whisper API
2. Check that the API key is correctly set in the `.env` file
3. Run the `fix_openai_api.py` script to fix any formatting issues:
   ```bash
   python fix_openai_api.py
   ```

### Connection Issues

If you cannot connect to the OpenAI API:

1. Check your internet connection
2. Verify that your API key is valid and not expired
3. Test the API connection directly:
   ```bash
   python test_openai_api.py
   ```

### Docker Issues

If running with Docker:

1. Make sure Docker is running
2. Check that the environment variables are correctly passed to the container
3. Restart the service:
   ```bash
   docker compose -f nxt-compose.yml restart video-analyzer
   ```

## Accessing the Video Analyzer

Once the service is running, you can access the video analyzer at:

```
http://localhost:5002
```

## Additional Commands

- **Check service status**: `docker compose -f nxt-compose.yml ps`
- **View logs**: `docker compose -f nxt-compose.yml logs -f video-analyzer`
- **Stop service**: `docker compose -f nxt-compose.yml stop video-analyzer`