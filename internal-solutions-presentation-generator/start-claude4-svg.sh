#!/bin/bash

# Claude 4 SVG Presentation Generator Startup Script
# Ensures the updated app.py with Claude 4 SVG generation is always loaded

echo "🎯 Starting Claude 4 SVG Presentation Generator..."
echo "📊 Features: Direct SVG generation, PowerPoint master layout integration"

# Kill any existing processes
pkill -f "python app.py" 2>/dev/null || true

# Check dependencies
echo "🔍 Checking dependencies..."
python -c "import cairosvg; print('✅ CairoSVG available')" 2>/dev/null || {
    echo "⚠️ Installing CairoSVG..."
    pip install cairosvg Wand
}

python -c "import anthropic; print('✅ Anthropic client available')" 2>/dev/null || {
    echo "❌ Anthropic client not available"
    exit 1
}

# Verify API keys
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY not set"
    exit 1
fi

echo "✅ All dependencies ready"

# Start the service
echo "🚀 Starting Claude 4 SVG generation service..."
python app.py