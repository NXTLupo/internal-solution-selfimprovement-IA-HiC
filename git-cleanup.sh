#\!/bin/bash

# Script to clean up files before Git operations
# This removes Python cache files, temp files, and other artifacts

# Set the base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR"

echo "Cleaning up project for Git..."

# Remove Python cache files - safely
find . -name "__pycache__" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
find . -name "*.pyc" -type f -delete 2>/dev/null || true
find . -name "*.pyo" -type f -delete 2>/dev/null || true
find . -name "*.pyd" -type f -delete 2>/dev/null || true

# Remove macOS metadata files
find . -name "._*" -type f -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true

# Remove temporary and log files
find . -name "*.log" -type f -delete 2>/dev/null || true
find . -name ".history" -type d -prune -exec rm -rf {} \; 2>/dev/null || true

# Create necessary empty directories to ensure proper structure
mkdir -p journey_maps uploads downloads logs

echo "Cleanup complete\!"
