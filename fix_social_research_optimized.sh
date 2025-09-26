#!/bin/bash
set -e

echo "Building and starting optimized social research backend container"

# Stop and remove the existing container if it exists
docker stop nxt-humans_ai_cx_workbench-social-research-backend-1 || true
docker rm nxt-humans_ai_cx_workbench-social-research-backend-1 || true

# Build the optimized backend image
cd internal-solutions-socialresearch/backend
chmod +x docker-build-optimized.sh
./docker-build-optimized.sh --tag social-research-backend-optimized

# Run the optimized container
docker run -d \
  --name nxt-humans_ai_cx_workbench-social-research-backend-1 \
  --network nxt-humans-network \
  -p 8081:8081 \
  -e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-***REDACTED-ANTHROPIC-KEY***} \
  -e CLAUDE_API_KEY=${CLAUDE_API_KEY:-***REDACTED-ANTHROPIC-KEY***} \
  -e OPENAI_API_KEY=${OPENAI_API_KEY:-} \
  -e CHATGPT5_API_KEY=${CHATGPT5_API_KEY:-} \
  -e GEMINI_API_KEY=${GEMINI_API_KEY:-} \
  -e REDDIT_CLIENT_ID=${REDDIT_CLIENT_ID:REDACTED} \
  -e REDDIT_CLIENT_SECRET=${REDDIT_CLIENT_SECRET:REDACTED} \
  -e REDDIT_USER_AGENT=${REDDIT_USER_AGENT:-nxt-humans-agent} \
  -e REDDIT_REDIRECT_URI=${REDDIT_REDIRECT_URI:-} \
  -e PORT=8081 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app \
  -e POSTGRES_SERVER=social-research-db \
  -e POSTGRES_HOST=social-research-db \
  -e POSTGRES_PORT=5432 \
  -e DATABASE_URL=postgresql://postgres:postgres@social-research-db:5432/app \
  -e FLASK_DEBUG=true \
  -v ${PWD}/internal-solutions-socialresearch:/app \
  social-research-backend-optimized

echo "Restarting social-mcp to ensure it connects to the fixed backend"
docker restart nxt-humans_ai_cx_workbench-social-mcp-1

echo "Optimized social research backend is now running"
echo "You can access it at http://localhost:8081"
echo "Please wait a few minutes for all dependencies to initialize"