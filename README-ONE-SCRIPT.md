# NXT HUMANS AI CX WORKBENCH - ONE SCRIPT EDITION

## Overview

This is the simplified One Script Edition of the NXT HUMANS AI CX WORKBENCH. All the functionality has been consolidated into a single launch script to streamline the user experience.

## Quick Start

To start all services including the Video Analyzer with API key support:

```bash
./launch-everything.sh
```

This script will:
1. Set up all required API keys (Anthropic and OpenAI)
2. Configure all environment variables
3. Create necessary directories
4. Start all services:
   - Launchpad (Central Dashboard)
   - Journey Mapper
   - Reddit Data Collector
   - Social Research Tool
   - Video Analyzer
   - AI Agent

## Services

Once started, you can access the services at:
- Launchpad: http://localhost:8000
- Journey Mapper: http://localhost:8080
- Reddit Ripper: http://localhost:5001
- Video Analyzer: http://localhost:5002

## Features

The One Script Edition includes all features of the original workbench:
- Reddit data collection
- Social media analysis with topic modeling
- AI-powered customer journey mapping
- Video analysis with transcription
- Integrated AI agent

## API Keys

The script automatically configures:
- Anthropic API Key (for Claude 3.7 Sonnet)
- OpenAI API Key (for Whisper transcription)

You don't need to manually set these keys - they're pre-configured in the launch script.

## Stopping Services

When you're done, you can stop all services by following the instructions shown at the end of the launch script.

## Notes

- The original shell scripts have been backed up to the `backup-scripts` directory and are no longer needed.
- This simplified version maintains all functionality while eliminating the need to remember multiple script names.