# API Key Setup for NXT HUMANS AI CX Workbench

This guide explains how to set up your API keys for the NXT HUMANS AI CX Workbench.

## API Keys Required

The workbench requires the following API keys:

1. **Anthropic API Key** - Required for:
   - Journey Mapper
   - Video Analyzer
   - Agent system
   - Social Research (Claude integration)

2. **OpenAI API Key** - Required for:
   - Social Research Tool analytics
   - Topic modeling (optional)

## Setup Options

### Option 1: Update Both API Keys at Once

The `update_all_api_keys.sh` script allows you to update both Anthropic and OpenAI API keys across all components of the workbench in a single operation.

```bash
# Usage
./update_all_api_keys.sh <anthropic_api_key> <openai_api_key>

# Example
./update_all_api_keys.sh "***REDACTED-ANTHROPIC-KEY***" "sk-your-openai-key"
```

This script will:
- Update the main `.env` file with both API keys
- Update the Journey Mapper's API key
- Update the Social Research API keys
- Update API keys in running containers (if Docker is running)
- Restart affected containers to apply changes

### Option 2: Update Only the Anthropic API Key

If you only want to update the Anthropic API key (which is required for most components), you can use the enhanced Anthropic key updater:

```bash
# Usage
./update_anthropic_key_enhanced.sh <anthropic_api_key>

# Example
./update_anthropic_key_enhanced.sh "***REDACTED-ANTHROPIC-KEY***"
```

This script focuses only on updating the Anthropic API key across all relevant components.

## Verifying API Key Setup

After running either of the update scripts, you can verify that the API keys have been properly set:

1. Check the main `.env` file:
   ```bash
   cat .env
   ```

2. Check the Journey Mapper's `.env` file:
   ```bash
   cat internal-solutions-journeymapper/.env
   ```

3. Test the API connection:
   ```bash
   # For Anthropic API
   python test-anthropic-api.py
   
   # For Journey Mapper
   cd internal-solutions-journeymapper
   python test_anthropic.py
   ```

## Starting the Workbench with Updated API Keys

After updating your API keys, you can start the workbench with all services:

```bash
./launch-with-all-services.sh
```

Or with just the agent service:

```bash
./launch-with-agent.sh
```

## Troubleshooting

If you encounter API key issues:

1. **API Key Format**: Ensure the Anthropic key starts with `sk-ant-` and is properly formatted
2. **Container Updates**: If containers were already running, restart them:
   ```bash
   docker-compose -f dynamic-compose.yml restart
   ```
3. **Environment Variables**: Verify environment variables are properly set in containers:
   ```bash
   docker exec -it <container_name> env | grep API_KEY
   ```
4. **Log Files**: Check application logs for API-related errors:
   ```bash
   docker logs <container_name>
   ```

## Manual API Key Updates

If you need to manually update API keys for specific components:

### Journey Mapper

```bash
echo "ANTHROPIC_API_KEY=your_key_here" > internal-solutions-journeymapper/.env
```

### Social Research

```bash
# Backend
echo "CLAUDE_API_KEY=your_anthropic_key" > internal-solutions-socialresearch/backend/.env
echo "OPENAI_API_KEY=your_openai_key" >> internal-solutions-socialresearch/backend/.env
```

### Agent

Update the key in Docker container:
```bash
docker exec <agent_container_id> bash -c "echo 'ANTHROPIC_API_KEY=your_key_here' > /app/.env"
docker restart <agent_container_id>
```

## Next Steps

After setting up your API keys, refer to the main documentation for using the workbench:
- [README.md](./README.md) - Main documentation
- [CLAUDE.md](./CLAUDE.md) - Claude Code instructions
- [CX_WORKBENCH_DOCUMENTATION.md](./CX_WORKBENCH_DOCUMENTATION.md) - Comprehensive documentation