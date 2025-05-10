#!/bin/bash

# Print clear instructions
echo "=================================================="
echo "            NXT HUMANS DOCKER LAUNCHER            "
echo "=================================================="
echo ""
echo "IMPORTANT: Make sure Docker Desktop is RUNNING"
echo "before continuing!"
echo ""
echo "If Docker Desktop is not running, please:"
echo "1. Press Ctrl+C to cancel this script"
echo "2. Start Docker Desktop app"
echo "3. Run this script again"
echo ""
echo "Press any key to continue (or Ctrl+C to cancel)..."
read -n 1 -s

# Change to the script's directory
cd "$(dirname "$0")"

# Run our Docker-only script
./docker-launcher.sh