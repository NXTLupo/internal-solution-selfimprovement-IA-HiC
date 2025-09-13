#!/bin/bash

echo "🔐 Setting up TRUSTED HTTPS certificates"
echo "========================================"
echo ""

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "📦 Installing mkcert..."
    brew install mkcert
fi

# Install local CA (requires manual password entry)
echo "🔧 Installing local Certificate Authority..."
echo "⚠️  You'll need to enter your password to install the CA:"
echo ""
echo "Run this command manually:"
echo "mkcert -install"
echo ""
echo "After that, press Enter to continue..."
read -p ""

# Generate trusted certificates
echo "📜 Generating trusted certificates..."
cd ssl-certs
mkcert localhost 127.0.0.1 ::1

if [ $? -eq 0 ]; then
    echo "✅ Trusted certificates generated!"
    echo ""
    echo "🔄 Restarting HTTPS proxy with trusted certificates..."
    
    # Restart HTTPS proxy to use new certificates
    cd ..
    docker compose -f docker-compose-https.yml down
    docker compose -f docker-compose-https.yml up -d
    
    echo ""
    echo "🎉 SUCCESS! Now visit https://localhost:8443"
    echo "You should see a TRUE GREEN LOCK with no warnings!"
    echo ""
    echo "🌟 The following URLs now have trusted HTTPS:"
    echo "• https://localhost:8443 (Launchpad)"
    echo "• https://localhost:8444 (Journey Mapper)"
    echo "• https://localhost:8445 (OpenAI Journey)"
    echo "• https://localhost:8446 (Reddit Collector)"
    echo "• https://localhost:8448 (Video Transcriptor)"
else
    echo "❌ Failed to generate certificates"
    exit 1
fi