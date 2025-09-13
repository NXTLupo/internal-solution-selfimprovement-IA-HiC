# Claude 4 Journey Mapper

The Claude 4 Journey Mapper is now available as a standalone service in the NXT HUMANS AI CX WORKBENCH. This service provides advanced journey mapping capabilities using Anthropic's Claude 4 model.

## Accessing the Claude 4 Journey Mapper

The Claude 4 Journey Mapper is available at:

**http://localhost:8095**

## Features

- Advanced journey mapping using Claude 4
- Support for Claude 3.7 Sonnet as a fallback
- Handles file uploads (CSV, TXT, PDF, JSON)
- Generates interactive HTML journey maps
- Provides PDF export functionality
- Optimized for detailed analysis and recommendations

## API Key

The Claude 4 Journey Mapper is configured with an Anthropic API key that allows it to access both Claude 4 and Claude 3.7 models.

## Integration with Launchpad

The Claude 4 Journey Mapper is running as a standalone service with its own Docker Compose configuration. To fully integrate it with the launchpad interface, you would need to restart all services using the fixed docker-compose-all.yml file:

```bash
docker compose -f docker-compose-all.yml.fixed down
docker compose -f docker-compose-all.yml.fixed up -d
```

For now, you can access the Claude 4 Journey Mapper directly at http://localhost:8095.

## Troubleshooting

If you encounter any issues with the Claude 4 Journey Mapper, you can:

1. Check the logs for any errors:
   ```bash
   docker logs nxthumans_ai_cx_workbench-claude4-journey-mapper-1
   ```

2. Restart the service:
   ```bash
   docker restart nxthumans_ai_cx_workbench-claude4-journey-mapper-1
   ```

3. Update the API key if needed:
   ```bash
   ./update_claude4_api_key.sh
   ```

## Technical Details

- Port: 8095
- Container name: nxthumans_ai_cx_workbench-claude4-journey-mapper-1
- Internal port: 8000
- API key environment variable: ANTHROPIC_API_KEY
- Model: claude-3-7-sonnet-20250219 (until Claude 4 API access is fully available)