#!/bin/bash

# Development script for NXT Miro Generator
set -e

echo "🔧 Starting NXT Miro Generator development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your Miro access token"
    echo "   MIRO_ACCESS_TOKEN=your_token_here"
    echo ""
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Function to run with proper error handling
run_command() {
    local cmd="$1"
    local description="$2"
    
    echo "🚀 $description"
    echo "   Command: $cmd"
    echo ""
    
    if ! eval "$cmd"; then
        echo "❌ Failed: $description"
        exit 1
    fi
}

# Check command line arguments
case "${1:-help}" in
    "validate")
        run_command "npm run dev -- validate -i examples/sample-journey-map.html -v" "Validating sample journey map"
        ;;
    "generate")
        run_command "npm run dev -- generate -i examples/sample-journey-map.html --dry-run -v" "Generating board (dry run)"
        ;;
    "test-api")
        run_command "npm run dev -- test -v" "Testing Miro API connection"
        ;;
    "config")
        run_command "npm run dev -- config --show" "Showing current configuration"
        ;;
    "build")
        run_command "npm run build" "Building TypeScript"
        ;;
    "watch")
        echo "👀 Starting TypeScript watch mode..."
        npm run watch
        ;;
    "test")
        run_command "npm test" "Running tests"
        ;;
    "lint")
        run_command "npm run lint" "Running linter"
        ;;
    "docker")
        echo "🐳 Building Docker image..."
        npm run docker:build
        echo "✅ Docker image built successfully!"
        ;;
    "help"|*)
        echo "🎯 NXT Miro Generator Development Commands:"
        echo ""
        echo "   ./scripts/dev.sh validate    - Validate sample journey map"
        echo "   ./scripts/dev.sh generate    - Generate board (dry run)"
        echo "   ./scripts/dev.sh test-api    - Test Miro API connection"
        echo "   ./scripts/dev.sh config      - Show configuration"
        echo "   ./scripts/dev.sh build       - Build TypeScript"
        echo "   ./scripts/dev.sh watch       - Start watch mode"
        echo "   ./scripts/dev.sh test        - Run tests"
        echo "   ./scripts/dev.sh lint        - Run linter"
        echo "   ./scripts/dev.sh docker      - Build Docker image"
        echo "   ./scripts/dev.sh help        - Show this help"
        echo ""
        echo "💡 Tips:"
        echo "   - Make sure to set MIRO_ACCESS_TOKEN in .env"
        echo "   - Use 'npm run dev -- <command>' for direct CLI access"
        echo "   - Check examples/ for sample journey maps"
        echo ""
        ;;
esac

echo "✅ Development command completed!"