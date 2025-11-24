# Research Generator Integration Notes

## Overview
The PersonaStory AI Research Generator has been successfully integrated into the NXT-HUMANS Intelligence Augmentation Suite. This document outlines the integration details and how to use the service.

## Integration Components

### 1. Core Service (Port 5011)
- **Location**: `internal-solutions-research-generator/`
- **Technology**: React + TypeScript frontend, Flask backend
- **API**: Gemini 3 Pro with extended thinking
- **Features**: Research analysis, persona generation, video scripts, strategy decks

### 2. Flask Backend Wrapper
- **File**: `app.py`
- **Purpose**: Serves the React app and injects the GEMINI_API_KEY
- **Port**: 5011
- **Health Check**: `/health`

### 3. Docker Configuration
- **Dockerfile**: Multi-stage build for optimized container
- **docker-compose-all.yml**: Service definition with environment variables
- **Volume**: `research-generator-data` for file uploads

### 4. MCP Wrapper (Port 8507)
- **Location**: `mcp-services/research-mcp/`
- **Protocol**: JSON-RPC 2.0
- **Tools Available**:
  - `analyze_research_data`: Full analysis with multiple lenses
  - `generate_personas_from_research`: Create detailed personas
  - `create_video_script`: Generate video scripts from insights

### 5. Launchpad Integration
- **URL**: http://localhost:5011
- **Status Monitoring**: Real-time health checks
- **UI Card**: Located in the Analysis section

## Environment Variables

Required in `.env` file:
```
GEMINI_API_KEY=your-gemini-api-key
RESEARCH_GENERATOR_PORT=5011
RESEARCH_MCP_PORT=8507
```

## Starting the Service

### With Full Platform
```bash
# Windows
launch-windows.bat

# Linux/Mac/Git Bash
./launch.sh
```

### Standalone Testing
```bash
# Build and run just the Research Generator
docker compose -f docker-compose-all.yml up research-generator

# With MCP wrapper
docker compose -f docker-compose-all.yml up research-generator research-mcp
```

## Using the Service

### Via Web Interface
1. Open http://localhost:8000 (Launchpad)
2. Click on "PersonaStory AI Research Generator"
3. Upload research data (CSV, TXT, etc.)
4. Select analysis type and generate insights

### Via AI Agent (if enabled)
The agent can access Research Generator tools through the MCP wrapper:
- Upload files and request analysis
- Generate personas from research text
- Create video scripts from insights

## API Endpoints

### Flask Backend
- `GET /` - Main React app
- `GET /health` - Health check
- `GET /api/status` - Service status
- `GET /api/info` - Service information

### MCP Wrapper
- `POST /mcp` - JSON-RPC 2.0 endpoint
- `GET /health` - Health check
- `GET /mcp/tools` - List available tools (legacy)
- `POST /mcp/invoke/{tool_name}` - Invoke tool (legacy)

## Troubleshooting

### Service Not Starting
1. Check GEMINI_API_KEY is set in .env
2. Verify port 5011 is available: `python port_scanner.py --fix`
3. Check Docker logs: `docker compose -f docker-compose-all.yml logs research-generator`

### API Key Issues
- Ensure GEMINI_API_KEY is in .env file
- Restart service after updating .env
- Check browser console for API key injection

### Build Errors
- Clear Docker cache: `docker system prune -f`
- Rebuild: `docker compose -f docker-compose-all.yml build --no-cache research-generator`

## File Structure
```
internal-solutions-research-generator/
├── app.py                 # Flask backend
├── App.tsx               # Main React component
├── Dockerfile            # Multi-stage build
├── package.json          # Node dependencies
├── requirements.txt      # Python dependencies
├── services/
│   └── geminiService.ts  # Gemini API integration
├── components/           # React components
├── types.ts             # TypeScript definitions
└── dist/                # Built React app (generated)
```

## Next Steps

1. **Add Demo Content**: Replace `launchpad/static/research-generator-demo.gif` with actual demo
2. **Test Integration**: Run full platform and verify all connections
3. **Optimize Performance**: Monitor resource usage and adjust if needed
4. **Documentation**: Update main README with Research Generator features

## Security Notes

- API key is injected server-side, not exposed in client code
- File uploads are handled securely through Flask
- MCP wrapper validates all inputs before processing
- No hardcoded credentials in source code