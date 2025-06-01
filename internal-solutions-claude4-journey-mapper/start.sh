#!/bin/bash

# Set up environment and run the Claude 4 Journey Mapper

# Create necessary directories
mkdir -p uploads journey_maps logs static

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "No ANTHROPIC_API_KEY environment variable detected."
    echo "You will be prompted to enter your API key when running the application."
fi

# Set default model to Claude 4
export ANTHROPIC_MODEL="claude-sonnet-4-20250514"

# Run the application
python run.py