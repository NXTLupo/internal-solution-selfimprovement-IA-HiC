# Launchpad Services Analysis and Cleanup Guide

> **Generated**: December 2025
> **Branch**: innovation-alpha-005
> **Platform**: NXT Humans AI CX Workbench

## Executive Summary

The CX Intelligence Augmentation Launchpad serves 13 active services through a sophisticated architecture involving Docker containers, MCP wrappers, and WebSocket proxies. This document provides a comprehensive mapping of active services to their code directories and identifies extraneous files that can be safely removed.

## Active Services Matrix

### Services Displayed on Launchpad (Port 8000)

| Service Name | Docker Service | Directory | Port | Entry Point | Status |
|-------------|---------------|-----------|------|-------------|---------|
| **Social Data Collector** | reddit-ripper | internal-solutions-reddit-ripper | 5001 | app_unified.py | ✅ Active (Multi-source) |
| **Video Analyzer** | video-analyzer | internal-solutions-video-analyzer | 5002 | app.py | ✅ Active |
| **Amazon Market Intelligence** | scrapehero-amazon | internal-solutions-scrapehero-amazon | 5008 | app.py | ✅ Active |
| **Social Research Analytics** | social-research-frontend/backend | internal-solutions-socialresearch | 3000/8081 | React/Flask | ✅ Active |
| **Journey Mapper (Claude 3.7)** | journey-mapper | internal-solutions-journeymapper | 8080 | run.py | ✅ Active |
| **Journey Mapper (Claude 4)** | claude4-journey-mapper | internal-solutions-claude4-journey-mapper-v2 | 8095 | app.py | ✅ Active (Recommended) |
| **LinkedIn Generator** | linkedin-generator | internal-solutions-linkedin-generator | 5003 | app.py | ✅ Active |
| **Miro Generator** | miro-generator | internal-solutions-miro-generator | 5004 | app.py | ✅ Active |
| **Character Generator** | consistent-character-generator | internal-solutions-consistent-character-generator | 5010 | app.py | ✅ Active |
| **Image Captioner** | image-captioner | internal-solutions-image-captioner | 5005 | app.py | ✅ Active |
| **Flux LoRA Studio** | flux-lora-studio | internal-solutions-flux-lora-studio | 5006 | app.py | ✅ Active |
| **Presentation Generator** | presentation-generator | internal-solutions-presentation-generator | 5007 | app.py | ✅ Active |
| **Soundtrack Generator** | soundtrack-generator | internal-solutions-soundtrack-generator | 5009 | app.py | ✅ Active |

### MCP Service Wrappers (Agent Integration)

| MCP Service | Port | Wraps Service | Purpose |
|------------|------|---------------|----------|
| reddit-mcp | 8501 | Reddit Ripper (5001) | MCP interface for social data collection |
| social-mcp | 8502 | Social Research (3000/8081) | MCP interface for analytics |
| journey-mcp | 8503 | Journey Mapper Claude 3.7 (8080) | MCP interface for journey mapping |
| video-mcp | 8504 | Video Analyzer (5002) | MCP interface for video analysis |
| openai-journey-mcp | 8505 | OpenAI Journey Mapper (8090) | MCP interface (not displayed) |
| claude4-journey-mcp | 8506 | Claude 4 Journey Mapper (8095) | MCP interface for Claude 4 |

## Extraneous Files and Directories for Cleanup

### 1. Completely Unused Directories
```bash
# Empty directory - can be deleted
rm -rf internal-solutions-mulmocast/

# Not linked from Launchpad but has Docker service
# Check if actually needed for MCP wrapper before deletion
# internal-solutions-openai-journey-mapper/
```

### 2. OpenAI Journey Mapper Analysis
- **Directory**: `internal-solutions-openai-journey-mapper/`
- **Status**: Has Docker service definition but NOT displayed on Launchpad
- **Port**: 8090 (openai-journey-mcp uses port 8505)
- **Recommendation**: Verify if MCP wrapper (8505) depends on it, otherwise remove

### 3. Scattered Test Files (Root Directory)
```bash
# Consolidated test files that can be moved to /tests directory
test-anthropic-api.py
test_openai_api.py
test_agent_tools_comprehensive.py
test_agent_ws.py
test_whisper_api.py
test_social_research_fix.py
test_claude4_comprehensive_analysis.py
test_video_transcriber.py
test_whisper_corrected.py
test_social_research_ai.py
test_video_api_fix.py
# ... (68+ test files total)
```

### 4. Duplicate/Old Files in Services

#### Video Analyzer
```bash
# Multiple environment setup scripts (consolidate to one)
internal-solutions-video-analyzer/set_env.py
internal-solutions-video-analyzer/set_env_at_startup.py
internal-solutions-video-analyzer/inject_env.py
internal-solutions-video-analyzer/env_fix.py
internal-solutions-video-analyzer/load_env.py

# Old fix scripts
internal-solutions-video-analyzer/fix_413_error.py
internal-solutions-video-analyzer/fix_openai.py
internal-solutions-video-analyzer/fix_whisper_chunking.py
```

#### Reddit Ripper
```bash
# Old single-source version (now using app_unified.py)
internal-solutions-reddit-ripper/app.py  # Keep for reference
internal-solutions-reddit-ripper/main.py  # Old CLI version

# Test files that should be in tests/
internal-solutions-reddit-ripper/test_*.py (7 files)
internal-solutions-reddit-ripper/debug_trustpilot.py
```

#### Journey Mappers
```bash
# Duplicate restart scripts
internal-solutions-journeymapper/restart.sh
internal-solutions-journeymapper/restart_cross_platform.sh
internal-solutions-journeymapper/force_kill_ports.sh
internal-solutions-journeymapper/kill_server.py

# Similar duplicates in claude4-journey-mapper-v2
```

### 5. Generated Content Directories
These should be in .gitignore and periodically cleaned:
```bash
*/generated_content/
*/uploads/
*/downloads/
*/dist/
*/__pycache__/
*/node_modules/
*/logs/
*/output/
```

### 6. Documentation Files to Consolidate
```bash
# Multiple README variants per service
README.md
README-UPDATED.md
SETUP.md
DEPLOYMENT.md
IMPLEMENTATION_PLAN.md
FINAL_IMPLEMENTATION.md
```

## Architecture Flow

```
Browser
    ↓
Launchpad (8000) - WebSocket Proxy & Service Router
    ↓
Agent (8500) - Orchestrator with Claude/GPT integration
    ↓
MCP Services (8501-8507) - Standardized AI interfaces
    ↓
Core Services (5001-5010, 8080-8095) - Actual functionality
```

## Service Technology Stacks

### Modern Stack (2024-2025)
- **Social Research**: React 19.0.0, TypeScript 5.7.2, Vite 6.1.0, PostgreSQL 16, pgvector
- **Reddit Ripper**: Flask, BeautifulSoup4, Multi-source collectors (Reddit, TrustPilot, Play Store)
- **Miro Generator**: TypeScript 5.3.2, Commander.js, Jest (only service with complete tests)

### AI-Powered Services
- **Journey Mappers**: Claude 3.7 Sonnet / Claude 4 Sonnet
- **LinkedIn Generator**: Claude API for content generation
- **Presentation Generator**: Claude for slides, OpenAI for visuals
- **Video Analyzer**: OpenAI Whisper API for transcription

### Legacy but Stable
- **Journey Mapper (3.7)**: React 17, Webpack 5, Babel 7 (kept for Mermaid.js compatibility)

## Cleanup Commands

### Safe Cleanup Script
```bash
#!/bin/bash
# cleanup_workspace.sh

# Create tests directory and move test files
mkdir -p tests
mv test_*.py tests/ 2>/dev/null

# Remove empty directory
rm -rf internal-solutions-mulmocast/

# Clean Python cache
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null

# Clean node modules (careful - need to npm install after)
# find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null

# Remove generated content
find . -type d -name "generated_content" -exec rm -rf {} + 2>/dev/null
find . -type d -name "uploads" -exec rm -rf {} + 2>/dev/null
find . -type d -name "downloads" -exec rm -rf {} + 2>/dev/null

# Remove log files older than 7 days
find . -name "*.log" -mtime +7 -delete

# Remove Python compiled files
find . -name "*.pyc" -delete
find . -name "*.pyo" -delete
```

### Docker Cleanup
```bash
# Remove unused containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes (careful!)
docker volume prune -f

# Full system cleanup
docker system prune -a -f --volumes
```

## Service Health Checks

### Quick Status Check
```bash
# Check all services
docker compose -f docker-compose-all.yml ps

# Check specific service logs
docker compose -f docker-compose-all.yml logs -f [service-name]

# Restart problematic service
docker compose -f docker-compose-all.yml restart [service-name]
```

### Port Status
```bash
python port_scanner.py --check
```

## Recommendations

### Immediate Actions
1. ✅ Move all root test_*.py files to /tests directory
2. ✅ Delete internal-solutions-mulmocast (empty)
3. ✅ Add generated directories to .gitignore
4. ✅ Consolidate environment setup scripts in video-analyzer

### Consider for Removal
1. ⚠️ internal-solutions-openai-journey-mapper - Verify MCP dependency first
2. ⚠️ Old app.py files where app_unified.py exists
3. ⚠️ Duplicate documentation files (keep only latest)

### Keep for Now
1. ✔️ All 13 active services displayed on Launchpad
2. ✔️ MCP wrapper services (critical for agent integration)
3. ✔️ Docker configuration files
4. ✔️ Agent service (port 8500) - NEVER modify

## Testing Infrastructure Gaps

### Current State
- **Python**: 68+ test scripts scattered, no pytest.ini
- **TypeScript**: Only Miro Generator has Jest setup
- **React Apps**: No test configuration

### Recommended Structure
```
/tests
  /unit
    /python
    /typescript
  /integration
    /services
    /mcp
  /e2e
    /launchpad
    /agent
```

## Maintenance Notes

- **Critical**: Never modify `mcp-services/agent/app.py` without backup
- **Backup exists**: `mcp-services/agent/app.py.backup.websocket_fix`
- **API Keys**: Check `.env` file in root (never commit)
- **Branch**: Current work on innovation-alpha-005
- **Windows**: Use Git Bash or WSL for shell scripts

---

*This analysis represents the state of the platform as of December 2025 on the innovation-alpha-005 branch.*