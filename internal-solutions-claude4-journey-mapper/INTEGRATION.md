# Claude 4 Journey Mapper Integration Guide

This document explains how to integrate the Claude 4 Journey Mapper with the NXT Humans AI CX Workbench.

## Overview

The Claude 4 Journey Mapper is a specialized implementation optimized for Claude 4 Sonnet that provides enhanced journey mapping capabilities. This guide explains how to:

1. Run the Claude 4 Journey Mapper as a standalone service
2. Integrate it with the MCP architecture for agent access
3. Add it to the complete workbench ecosystem

## Prerequisites

- Docker and Docker Compose
- Anthropic API key with access to Claude 4 models
- The NXT Humans AI CX Workbench codebase

## Running as a Standalone Service

To run the Claude 4 Journey Mapper by itself:

```bash
# Navigate to the Claude 4 Journey Mapper directory
cd internal-solutions-claude4-journey-mapper

# Set your Anthropic API key
export ANTHROPIC_API_KEY=your_api_key_here

# Run with Docker Compose
docker compose up -d
```

This will start the service on port 8090. You can access it at http://localhost:8090.

## Running with MCP Integration

To run the Claude 4 Journey Mapper with its MCP service for agent integration:

```bash
# Navigate to the Claude 4 Journey Mapper directory
cd internal-solutions-claude4-journey-mapper

# Set your Anthropic API key
export ANTHROPIC_API_KEY=your_api_key_here

# Make the script executable (if not already)
chmod +x run-with-mcp.sh

# Run the integration script
./run-with-mcp.sh
```

This will:
- Start the Claude 4 Journey Mapper on port 8090
- Start the MCP service on port 8091
- Create the necessary Docker network

## Integrating with the Full Workbench

To add the Claude 4 Journey Mapper to the complete workbench:

1. Copy the `docker-compose-all.yml` file to the root of the workbench:

```bash
cp internal-solutions-claude4-journey-mapper/docker-compose-all.yml docker-compose-all.yml
```

2. Set your API keys:

```bash
export ANTHROPIC_API_KEY=your_anthropic_api_key
export OPENAI_API_KEY=your_openai_api_key
```

3. Start the full workbench:

```bash
docker compose -f docker-compose-all.yml up -d
```

## MCP Tool Usage

The Claude 4 Journey Mapper provides the following MCP tools for agent use:

- `claude4_journey.upload_file`: Upload a file for journey mapping
- `claude4_journey.generate_map`: Generate a journey map from an uploaded file
- `claude4_journey.get_status`: Check the status of a journey map generation
- `claude4_journey.get_results`: Get the results of a completed journey mapping
- `claude4_journey.list_maps`: List all available journey maps

These tools can be accessed by the agent when the MCP service is running and integrated with the agent.

## Updating the Launchpad

To update the launchpad to include links to the Claude 4 Journey Mapper:

1. Add the following environment variables to the launchpad service:

```
CLAUDE4_JOURNEY_MAPPER_URL=http://claude4-journey-mapper:8000
CLAUDE4_JOURNEY_MAPPER_CLIENT_URL=http://localhost:8090
```

2. Update the launchpad templates to include links to the Claude 4 Journey Mapper.

## Troubleshooting

If you encounter issues:

1. Check the logs:
```bash
docker logs claude4-journey-mapper
docker logs claude4-journey-mcp
```

2. Verify the API key:
```bash
docker exec -it claude4-journey-mapper python -c "import os; print(os.environ.get('ANTHROPIC_API_KEY'))"
```

3. Ensure the Docker network exists:
```bash
docker network inspect workbench-network
```

4. Check port availability:
```bash
lsof -i :8090
lsof -i :8091
```