#!/bin/bash

echo "🔄 Restarting FLUX LoRA Studio service..."

# Stop the specific service
echo "Stopping flux-lora-studio service..."
docker compose -f docker-compose-all.yml stop flux-lora-studio

# Rebuild the service to pick up code changes
echo "Rebuilding flux-lora-studio service..."
docker compose -f docker-compose-all.yml build flux-lora-studio

# Start the service again
echo "Starting flux-lora-studio service..."
docker compose -f docker-compose-all.yml up -d flux-lora-studio

# Wait a moment for startup
sleep 3

# Check service status
echo "Checking service status..."
docker compose -f docker-compose-all.yml ps flux-lora-studio

# Test health endpoint
echo "Testing health endpoint..."
curl -s http://localhost:5006/health | python3 -m json.tool || echo "Health check failed"

echo "✅ FLUX LoRA Studio service restart complete!"
echo "🌐 Access at: http://localhost:5006"