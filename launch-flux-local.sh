#!/bin/bash

# FLUX LoRA Studio Local Launcher for Apple Silicon M3
# This script launches FLUX LoRA Studio with native Apple Silicon optimization

set -e

echo "🚀 Starting FLUX LoRA Studio for Apple Silicon M3..."

# Check if Image Captioner is running
if curl -s http://localhost:5005/health > /dev/null 2>&1; then
    echo "✅ Image Captioner dependency verified"
    CAPTIONER_URL="http://localhost:5005"
else
    echo "❌ Image Captioner not running. Please start the workbench first: ./launch.sh"
    exit 1
fi

# Check if FLUX is already running
if curl -s http://localhost:5006/health > /dev/null 2>&1; then
    echo "⚠️  FLUX LoRA Studio is already running on port 5006"
    echo "🌐 Opening http://localhost:5006"
    open http://localhost:5006 2>/dev/null || true
    exit 0
fi

# Navigate to FLUX directory (handle spaces properly)
FLUX_DIR="/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-flux-lora-studio"

if [ ! -d "$FLUX_DIR" ]; then
    echo "❌ FLUX LoRA Studio directory not found: $FLUX_DIR"
    exit 1
fi

# Change to directory with proper quoting
cd "$FLUX_DIR" || {
    echo "❌ Failed to change to directory: $FLUX_DIR"
    exit 1
}

# Check if run-local.py exists
if [ ! -f "run-local.py" ]; then
    echo "❌ run-local.py not found in $FLUX_DIR"
    exit 1
fi

# Set environment variables
export IMAGE_CAPTIONER_URL="$CAPTIONER_URL"
export DEVELOPMENT_MODE="local"

echo "🍎 Launching with Apple Silicon M3 optimization..."
echo "📂 Working directory: $FLUX_DIR"
echo "🔗 Image Captioner: $CAPTIONER_URL"

# Launch in background
nohup python run-local.py > /tmp/flux-lora-studio.log 2>&1 &
FLUX_PID=$!

echo "🔄 Process ID: $FLUX_PID"
echo "📝 Logs: /tmp/flux-lora-studio.log"

# Save PID for potential cleanup
echo $FLUX_PID > /tmp/flux-lora-studio.pid

# Wait a moment for startup
sleep 3

# Check if service started successfully
if curl -s http://localhost:5006/health > /dev/null 2>&1; then
    echo "✅ FLUX LoRA Studio started successfully!"
    echo "🌐 Opening http://localhost:5006"
    open http://localhost:5006 2>/dev/null || true
else
    echo "⏳ FLUX LoRA Studio is starting... please wait a moment"
    echo "🌐 Try opening http://localhost:5006 in a few seconds"
fi

echo ""
echo "🎯 FLUX LoRA Studio is now running locally with:"
echo "   • Native Apple Silicon M3 performance"
echo "   • Kohya_ss training framework" 
echo "   • A11y Image Captioner integration"
echo "   • Real SafeTensors model output"
echo ""
echo "💡 To stop: kill \$(cat /tmp/flux-lora-studio.pid)"