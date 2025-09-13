#!/bin/bash

echo "🔍 COMPREHENSIVE 404 ERROR CHECKER"
echo "=================================="

# Function to test if a URL returns 404
check_resource() {
    local service_name="$1"
    local port="$2"
    local resource_path="$3"
    local url="http://localhost:${port}${resource_path}"
    
    response=$(curl -s -I "$url" | head -1)
    if echo "$response" | grep -q "404"; then
        echo "❌ $service_name: $resource_path - 404 NOT FOUND"
        return 1
    elif echo "$response" | grep -q "200 OK"; then
        echo "✅ $service_name: $resource_path - OK"
        return 0
    else
        echo "⚠️  $service_name: $resource_path - Unexpected response: $response"
        return 1
    fi
}

echo "🚀 Checking all static resources across services..."
echo ""

# Launchpad (8000)
echo "--- LAUNCHPAD (8000) ---"
check_resource "Launchpad" "8000" "/static/favicon.ico"
check_resource "Launchpad" "8000" "/static/nxt-humans-logo.png"
check_resource "Launchpad" "8000" "/static/nxt-humans-styles.css"
check_resource "Launchpad" "8000" "/static/enhanced-components.css"
check_resource "Launchpad" "8000" "/static/enterprise-dashboard.css"
check_resource "Launchpad" "8000" "/static/nxt-header.css"
check_resource "Launchpad" "8000" "/static/chatbot.css"

# Journey Mapper Claude 3.7 (8080)
echo ""
echo "--- JOURNEY MAPPER CLAUDE 3.7 (8080) ---"
check_resource "Journey Mapper" "8080" "/static/route-favicon.svg"
check_resource "Journey Mapper" "8080" "/static/css/styles.css"
check_resource "Journey Mapper" "8080" "/static/nxt-humans-styles.css"
check_resource "Journey Mapper" "8080" "/static/nxt-header.css"

# Journey Mapper Claude 4 (8095)
echo ""
echo "--- JOURNEY MAPPER CLAUDE 4 (8095) ---"
check_resource "Claude 4 Journey" "8095" "/static/claude4-favicon.svg"

# Journey Mapper OpenAI o3 (8090)
echo ""
echo "--- JOURNEY MAPPER OPENAI O3 (8090) ---"
check_resource "OpenAI Journey" "8090" "/static/brain-favicon.svg"
check_resource "OpenAI Journey" "8090" "/static/css/styles.css"
check_resource "OpenAI Journey" "8090" "/static/nxt-humans-styles.css"
check_resource "OpenAI Journey" "8090" "/static/nxt-header.css"

# Reddit Data Collector (5001)
echo ""
echo "--- REDDIT DATA COLLECTOR (5001) ---"
check_resource "Reddit Ripper" "5001" "/static/reddit-favicon.svg"
check_resource "Reddit Ripper" "5001" "/static/favicon.ico"
check_resource "Reddit Ripper" "5001" "/static/nxt-humans-styles.css"
check_resource "Reddit Ripper" "5001" "/static/enhanced-components.css"
check_resource "Reddit Ripper" "5001" "/static/nxt-header.css"

# Social Research Tool (3000)
echo ""
echo "--- SOCIAL RESEARCH TOOL (3000) ---"
check_resource "Social Research" "3000" "/chart-favicon.svg"
check_resource "Social Research" "3000" "/static/nxt-humans-styles.css"
check_resource "Social Research" "3000" "/static/nxt-header.css"

# Video Transcriptor (5002)
echo ""
echo "--- VIDEO TRANSCRIPTOR (5002) ---"
check_resource "Video Transcriptor" "5002" "/static/video-favicon.svg"
check_resource "Video Transcriptor" "5002" "/static/nxt-humans-styles.css"
check_resource "Video Transcriptor" "5002" "/static/enhanced-styles.css"
check_resource "Video Transcriptor" "5002" "/static/enhanced-components.css"
check_resource "Video Transcriptor" "5002" "/static/nxt-header.css"

# LinkedIn Post Generator (5003)
echo ""
echo "--- LINKEDIN POST GENERATOR (5003) ---"
check_resource "LinkedIn Generator" "5003" "/static/linkedin-favicon.svg"
check_resource "LinkedIn Generator" "5003" "/static/css/nxt-header.css"
check_resource "LinkedIn Generator" "5003" "/static/css/linkedin-styles.css"

# Miro Generator (5004)
echo ""
echo "--- MIRO GENERATOR (5004) ---"
check_resource "Miro Generator" "5004" "/static/miro-favicon.svg"
check_resource "Miro Generator" "5004" "/static/nxt-humans-logo.png"
check_resource "Miro Generator" "5004" "/static/nxt-header.css"
check_resource "Miro Generator" "5004" "/static/nxt-humans-styles.css"
check_resource "Miro Generator" "5004" "/static/enhanced-components.css"

echo ""
echo "🔧 TROUBLESHOOTING:"
echo "- If any resources return 404, check that the service is running"
echo "- Verify file exists in the correct static directory"
echo "- Check Docker container logs: docker compose -f docker-compose-all.yml logs [service-name]"
echo "- Restart services if needed: docker compose -f docker-compose-all.yml restart"