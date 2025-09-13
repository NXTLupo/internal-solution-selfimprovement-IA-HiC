#!/bin/bash

echo "🔐 Installing SSL Certificate for Permanent Green Lock"
echo "=================================================="
echo ""

# Check if certificate exists
if [ ! -f "ssl-certs/localhost.crt" ]; then
    echo "❌ Certificate not found at ssl-certs/localhost.crt"
    echo "Run ./launch.sh first to generate certificates"
    exit 1
fi

echo "📋 MANUAL INSTALLATION STEPS:"
echo ""
echo "1️⃣  Double-click this file in Finder:"
echo "    $(pwd)/ssl-certs/localhost.crt"
echo ""
echo "2️⃣  When prompted, click 'Add' to add to Keychain"
echo ""
echo "3️⃣  Open Keychain Access app (search in Spotlight)"
echo ""
echo "4️⃣  Find 'localhost' certificate in the list"
echo ""
echo "5️⃣  Double-click the 'localhost' certificate"
echo ""
echo "6️⃣  Expand 'Trust' section"
echo ""
echo "7️⃣  Change 'When using this certificate' to 'Always Trust'"
echo ""
echo "8️⃣  Close the window and enter your password when prompted"
echo ""
echo "✅ After this, HTTPS URLs will show green lock with no warnings!"
echo ""
echo "🚀 ALTERNATIVE - Try this command in Terminal:"
echo "sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ssl-certs/localhost.crt"
echo ""
echo "📍 Current certificate location: $(pwd)/ssl-certs/localhost.crt"

# Open the certificate file automatically
if command -v open >/dev/null 2>&1; then
    echo ""
    echo "🔄 Opening certificate file now..."
    open ssl-certs/localhost.crt
else
    echo ""
    echo "💡 Manually navigate to ssl-certs/localhost.crt and double-click it"
fi