#!/bin/bash
set -e

# Install dependencies if they're not already installed
pip install --no-cache-dir anthropic>=0.18.0 google-generativeai>=0.3.2 openai>=0.28.0 python-dotenv>=1.0.0

# Run the Flask application
exec "$@"