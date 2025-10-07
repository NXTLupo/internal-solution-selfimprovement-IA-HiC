#!/usr/bin/env python3
import os

# Set the API key
os.environ['ANTHROPIC_API_KEY'] = os.environ.get('ANTHROPIC_API_KEY', '')

# Print confirmation
print('Updated ANTHROPIC_API_KEY environment variable')
