#!/bin/bash

echo "🔍 NXT HUMANS FAVICON DEBUG SCRIPT"
echo "=================================="

# Function to test if a URL is accessible
test_favicon() {
    local service_name="$1"
    local port="$2"
    local favicon_path="$3"
    local url="http://localhost:${port}${favicon_path}"
    
    echo "Testing $service_name favicon..."
    echo "URL: $url"
    
    if curl -s -I "$url" | grep -q "200 OK"; then
        echo "✅ $service_name favicon is accessible"
    else
        echo "❌ $service_name favicon is NOT accessible"
        echo "   Check if service is running on port $port"
    fi
    echo ""
}

# Test all services
echo "🚀 Testing favicon accessibility across all services..."
echo ""

test_favicon "Launchpad" "8000" "/static/favicon.ico"
test_favicon "Journey Mapper (Claude 3.7)" "8080" "/static/route-favicon.svg"
test_favicon "Journey Mapper (Claude 4)" "8095" "/static/claude4-favicon.svg"
test_favicon "Journey Mapper (OpenAI o3)" "8090" "/static/brain-favicon.svg"
test_favicon "Reddit Data Collector" "5001" "/static/reddit-favicon.svg"
test_favicon "Social Research Tool" "3000" "/chart-favicon.svg"
test_favicon "Video Transcriptor" "5002" "/static/video-favicon.svg"
test_favicon "LinkedIn Post Generator" "5003" "/static/linkedin-favicon.svg"
test_favicon "Miro Board Generator" "5004" "/static/miro-favicon.svg"

echo "🔧 TROUBLESHOOTING TIPS:"
echo "1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Check browser developer tools (F12) for 404 errors"
echo "3. Restart Docker services: docker compose -f docker-compose-all.yml restart"
echo "4. Verify services are running: docker compose -f docker-compose-all.yml ps"
echo "5. For persistent issues, add ?t=\$(date +%s) to favicon URLs to force refresh"

echo ""
echo "💡 Quick favicon cache clear:"
echo "Chrome: Chrome Settings > Privacy > Clear browsing data > Cached images"
echo "Firefox: about:preferences#privacy > Clear Data > Cached Web Content"
echo "Safari: Safari > Preferences > Privacy > Manage Website Data > Remove All"