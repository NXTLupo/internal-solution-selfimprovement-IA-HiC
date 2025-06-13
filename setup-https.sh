#!/bin/bash

echo "🔐 NXT HUMANS HTTPS SETUP"
echo "========================="

echo "✅ HTTPS proxy is now running!"
echo ""
echo "🌐 **SECURE HTTPS URLS:**"
echo ""
echo "🏠 Main Launchpad:          https://localhost:8443"
echo "🗺️  Journey Mapper:          https://localhost:8444"
echo "🧠 OpenAI Journey Mapper:   https://localhost:8445"
echo "📱 Reddit Data Collector:   https://localhost:8446"
echo "📊 Social Research Tool:    https://localhost:8447"
echo "🎥 Video Transcriptor:      https://localhost:8448"
echo "💼 LinkedIn Generator:      https://localhost:8449"
echo "🔗 Miro Generator:          https://localhost:8450"

echo ""
echo "🔒 **BROWSER SECURITY SETUP:**"
echo ""
echo "Since these are self-signed certificates, you'll need to:"
echo ""
echo "1️⃣  **Accept the security warning** when first visiting each HTTPS URL"
echo "2️⃣  **Click 'Advanced' → 'Proceed to localhost (unsafe)'** in Chrome/Edge"
echo "3️⃣  **Click 'Accept the Risk and Continue'** in Firefox"
echo "4️⃣  **Click 'Visit this website'** in Safari"

echo ""
echo "🛡️  **INSTALL CERTIFICATE (OPTIONAL - for trusted green lock):**"
echo ""

# macOS certificate installation
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "**macOS Instructions:**"
    echo "1. Double-click: $PWD/ssl-certs/localhost.crt"
    echo "2. Click 'Add' to Keychain"
    echo "3. Open Keychain Access app"
    echo "4. Find 'localhost' certificate"
    echo "5. Right-click → Get Info → Trust → Always Trust"
    echo ""
    echo "Quick install command:"
    echo "sudo security add-trusted-cert -d -r trustRoot -k /System/Library/Keychains/SystemRootCertificates.keychain $PWD/ssl-certs/localhost.crt"
fi

echo ""
echo "🔧 **TESTING HTTPS CONNECTIONS:**"
echo ""

# Test all HTTPS endpoints
https_endpoints=(
    "8443:Launchpad"
    "8444:Journey Mapper"
    "8445:OpenAI Journey"
    "8446:Reddit Collector"
    "8447:Social Research"
    "8448:Video Transcriptor"
    "8449:LinkedIn Generator"
    "8450:Miro Generator"
)

for endpoint in "${https_endpoints[@]}"; do
    IFS=':' read -r port name <<< "$endpoint"
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost:${port} | grep -q "200"; then
        echo "✅ $name (https://localhost:${port}) - WORKING"
    else
        echo "❌ $name (https://localhost:${port}) - NOT RESPONDING"
    fi
done

echo ""
echo "🎯 **BENEFITS OF HTTPS:**"
echo "• 🔒 Green lock icon instead of 'Not Secure' warning"
echo "• 🛡️  Encrypted connections (even though it's localhost)"
echo "• 🚫 No browser security warnings"
echo "• ✨ Professional appearance"

echo ""
echo "📝 **NOTES:**"
echo "• HTTP URLs (8000, 5001, etc.) still work alongside HTTPS"
echo "• HTTPS uses ports 8443-8450 instead of original ports"
echo "• Self-signed certificates will show warnings until you accept them"
echo "• For production, use proper CA-signed certificates"

echo ""
echo "🚀 **START BROWSING:**"
echo "Visit https://localhost:8443 to access your secure NXT Humans Workbench!"