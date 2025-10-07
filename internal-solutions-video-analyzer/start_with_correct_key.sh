#!/bin/bash

# Force the correct OpenAI API key
export OPENAI_API_KEY="***REDACTED-OPENAI-KEY***"

echo "Starting Video Analyzer with correct OpenAI API key ending in: $(echo $OPENAI_API_KEY | tail -c 5)"

# Start the application
uvicorn app:app --host 0.0.0.0 --port 5000