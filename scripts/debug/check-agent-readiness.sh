#!/bin/bash

echo "🔍 Checking Agent Readiness for MCP Tools..."
echo ""

# Check if agent container is running
if ! docker ps --format "table {{.Names}}" | grep -q "agent"; then
    echo "❌ Agent container is not running"
    echo "   Run: docker compose -f docker-compose-all.yml up -d"
    exit 1
fi

echo "✅ Agent container is running"

# Check if video tools are cached
if docker logs agent 2>&1 | grep -q "Cached tool definition for video_transcribe_youtube"; then
    echo "✅ Video transcription tools are ready"
    VIDEO_READY=true
else
    echo "⏳ Video transcription tools not yet cached"
    VIDEO_READY=false
fi

# Check if journey tools are cached
if docker logs agent 2>&1 | grep -q "Cached tool definition for journey_generate_map"; then
    echo "✅ Journey mapping tools are ready"
    JOURNEY_READY=true
else
    echo "⏳ Journey mapping tools not yet cached"
    JOURNEY_READY=false
fi

# Check if reddit tools are cached
if docker logs agent 2>&1 | grep -q "Cached tool definition for reddit_search"; then
    echo "✅ Reddit tools are ready"
    REDDIT_READY=true
else
    echo "⏳ Reddit tools not yet cached"
    REDDIT_READY=false
fi

# Check if social tools are cached
if docker logs agent 2>&1 | grep -q "Cached tool definition for social_topic_model"; then
    echo "✅ Social research tools are ready"
    SOCIAL_READY=true
else
    echo "⏳ Social research tools not yet cached"
    SOCIAL_READY=false
fi

echo ""

# Overall status
if [ "$VIDEO_READY" = true ] && [ "$JOURNEY_READY" = true ] && [ "$REDDIT_READY" = true ] && [ "$SOCIAL_READY" = true ]; then
    echo "🎉 All MCP tools are ready! You can use the chatbot agent now."
    echo ""
    echo "Available tools:"
    echo "  📹 Video: video_transcribe_youtube, video_transcribe_file"
    echo "  🗺️  Journey: journey_generate_map, journey_upload_file"
    echo "  📱 Reddit: reddit_search, reddit_get_results"
    echo "  🔍 Social: social_topic_model, social_sentiment_analysis"
    exit 0
else
    echo "⏳ Some tools are still loading. Wait 5-10 seconds and try again."
    echo "   Or run: docker compose -f docker-compose-all.yml restart agent"
    exit 1
fi