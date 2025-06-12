#!/bin/bash

# Build script for NXT Miro Generator
set -e

echo "🚀 Building NXT Miro Generator..."

# Clean previous build
echo "🧹 Cleaning previous build..."
npm run clean

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm test

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Make CLI executable
echo "🔧 Making CLI executable..."
chmod +x dist/cli/index.js

# Create distribution package
echo "📦 Creating distribution package..."
mkdir -p dist-package
cp -r dist/* dist-package/
cp package.json dist-package/
cp README.md dist-package/
cp -r config dist-package/
cp -r examples dist-package/

echo "✅ Build completed successfully!"
echo "📍 Output directory: dist/"
echo "📍 Package directory: dist-package/"

# Optional: Test CLI
if [ "$1" = "--test" ]; then
    echo "🧪 Testing CLI..."
    node dist/cli/index.js --help
    echo "✅ CLI test passed!"
fi

# Optional: Create tarball
if [ "$1" = "--package" ]; then
    echo "📦 Creating tarball..."
    cd dist-package
    npm pack
    cd ..
    mv dist-package/*.tgz ./
    echo "✅ Package created!"
fi

echo "🎉 Build process complete!"