#!/bin/bash
# Startup script for Social Data Collector with fallback support

echo "Starting Social Data Collector..."

# Install dependencies
echo "Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

# Check which app to run
if [ -f "app_unified.py" ]; then
    echo "Starting unified Social Data Collector (Reddit + TrustPilot)..."
    python app_unified.py
else
    echo "Unified app not found, falling back to original Reddit-only collector..."
    python app.py
fi