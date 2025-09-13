#!/bin/bash

echo "🔄 FAVICON CACHE BUSTER & BROWSER FIX"
echo "====================================="

echo "🚀 Step 1: Testing all favicon accessibility..."

# Test all favicons are accessible
services=(
    "Launchpad:8000:/static/favicon.ico"
    "Reddit:5001:/static/favicon.ico"
    "Journey Mapper:8080:/static/favicon.ico"
    "OpenAI Journey:8090:/static/favicon.ico"
    "Social Research:3000:/favicon.ico"
    "Video Transcriptor:5002:/static/favicon.ico"
    "LinkedIn Generator:5003:/static/favicon.ico"
    "Miro Generator:5004:/static/favicon.ico"
)

all_good=true
for service in "${services[@]}"; do
    IFS=':' read -r name port path <<< "$service"
    url="http://localhost:${port}${path}"
    if curl -s -I "$url" | grep -q "200 OK"; then
        echo "✅ $name favicon accessible"
    else
        echo "❌ $name favicon NOT accessible at $url"
        all_good=false
    fi
done

if [ "$all_good" = false ]; then
    echo ""
    echo "⚠️  Some favicons are not accessible. Please check service status."
    echo "Run: docker compose -f docker-compose-all.yml ps"
    exit 1
fi

echo ""
echo "✅ All favicons are accessible!"
echo ""
echo "🧹 Step 2: BROWSER CACHE CLEARING INSTRUCTIONS"
echo ""
echo "🌐 **CHROME:**"
echo "   1. Press Ctrl+Shift+I (Windows) or Cmd+Option+I (Mac) to open DevTools"
echo "   2. Right-click the refresh button and select 'Empty Cache and Hard Reload'"
echo "   3. Or: Settings > Privacy > Clear browsing data > Cached images and files"
echo ""
echo "🦊 **FIREFOX:**"
echo "   1. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) for hard refresh"
echo "   2. Or: Settings > Privacy > Clear Data > Cached Web Content"
echo ""
echo "🔵 **SAFARI:**"
echo "   1. Press Cmd+Option+E to empty caches"
echo "   2. Or: Safari > Preferences > Privacy > Manage Website Data > Remove All"
echo ""
echo "🔧 **ALTERNATIVE METHODS:**"
echo ""
echo "📱 **Force favicon refresh for each service:**"
for service in "${services[@]}"; do
    IFS=':' read -r name port path <<< "$service"
    echo "   • $name: http://localhost:${port}${path}?v=\$(date +%s)"
done

echo ""
echo "🌍 **Visit these URLs in your browser to test favicons:**"
echo "   • Launchpad: http://localhost:8000"
echo "   • Reddit Data Collector: http://localhost:5001"
echo "   • Journey Mapper: http://localhost:8080"
echo "   • OpenAI Journey Mapper: http://localhost:8090"
echo "   • Social Research Tool: http://localhost:3000"
echo "   • Video Transcriptor: http://localhost:5002"
echo "   • LinkedIn Generator: http://localhost:5003"
echo "   • Miro Generator: http://localhost:5004"

echo ""
echo "💡 **IF FAVICONS STILL DON'T SHOW:**"
echo "   1. Close ALL browser tabs for localhost services"
echo "   2. Clear browser cache completely"
echo "   3. Restart your browser"
echo "   4. Visit the services again"
echo "   5. Check browser dev tools (F12) for any 404 errors"

echo ""
echo "🔍 **Browser DevTools Check:**"
echo "   1. Press F12 to open developer tools"
echo "   2. Go to Network tab"
echo "   3. Refresh the page"
echo "   4. Look for any red (failed) requests for favicon files"
echo "   5. If you see 404 errors, report the specific URLs that are failing"

echo ""
echo "✨ Your custom favicons should now be visible instead of the 'i' icon!"