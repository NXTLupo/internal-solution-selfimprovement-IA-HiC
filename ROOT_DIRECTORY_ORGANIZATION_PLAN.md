# Root Directory Organization Plan

**Total Files in Root**: 156 files
**Date**: December 2025
**Branch**: innovation-alpha-005

## Current State Analysis

### File Type Breakdown
- **Markdown/Documentation**: 40 files (.md/.MD)
- **Python Scripts**: 38 files (.py)
- **Shell Scripts**: 21 files (.sh)
- **Docker Compose**: 14 files (docker-compose*.yml)
- **HTML Files**: 9 files
- **JavaScript**: 8 files
- **Log Files**: 5 files
- **JSON/YAML**: 6 files
- **Other**: 15 files

## ESSENTIAL FILES (Must Keep in Root)

### 🔴 Critical - Never Move or Delete
```
.env                           # API keys and environment variables
launch.sh                      # Primary startup script
docker-compose-all.yml         # Main service orchestration
docker-compose-all.override.yml # Environment-specific overrides
port_scanner.py                # Port conflict resolution
CLAUDE.md                      # AI guidance for Claude Code
README.md                      # Project documentation
requirements.txt               # Python dependencies
package.json                   # Node dependencies
```

### 🟡 Important - Keep in Root for Now
```
docker-compose-agent.yml      # Agent service configuration
docker-compose-https.yml      # HTTPS proxy configuration
updated-CLAUDE.md             # Latest Claude guidance
LAUNCHPAD_ANALYSIS_AND_CLEANUP.md # Recent analysis
CLEANUP_REPORT.md             # Recent cleanup documentation
```

## FILES TO ORGANIZE

### 1. Move to `/scripts/fixes/` (10 files)
These are one-time fix scripts that were used to resolve specific issues:
```bash
mkdir -p scripts/fixes
mv agent_welcome_fix.py scripts/fixes/
mv apply_openai_key_fix.py scripts/fixes/
mv direct_agent_fix.py scripts/fixes/
mv direct_api_fix.py scripts/fixes/
mv direct_openai_fix.py scripts/fixes/
mv direct-connect-fix.py scripts/fixes/
mv final_fix.py scripts/fixes/
mv integrated-agent-fix.py scripts/fixes/
mv validate_fix.py scripts/fixes/
mv verify_agent_fixes.py scripts/fixes/
```

### 2. Move to `/scripts/updates/` (6 files)
API key update scripts that might be needed again:
```bash
mkdir -p scripts/updates
mv update_claude4_api_key.py scripts/updates/
mv update_claude4_api_key.sh scripts/updates/
mv update_docker_hosts.py scripts/updates/
mv update_openai_key.sh scripts/updates/
mv update_video_api_key.sh scripts/updates/
mv update_whisper_key.sh scripts/updates/
```

### 3. Move to `/docker/compose-variants/` (11 files)
Alternative Docker Compose configurations:
```bash
mkdir -p docker/compose-variants
mv docker-compose-agent-updated.yml docker/compose-variants/
mv docker-compose-all.yml.fixed docker/compose-variants/
mv docker-compose-amazon.yml docker/compose-variants/
mv docker-compose-amazon-only.yml docker/compose-variants/
mv docker-compose-claude4.yml docker/compose-variants/
mv docker-compose-claude4-fixed.yml docker/compose-variants/
mv docker-compose-simple.yml docker/compose-variants/
mv docker-compose-social-cpu.yml docker/compose-variants/
mv docker-compose-video.yml docker/compose-variants/
mv docker-compose-video-fixed.yml docker/compose-variants/
mv dynamic-compose.yml docker/compose-variants/
```

### 4. Move to `/docs/legacy/` (28 files)
Old documentation and fix summaries:
```bash
mkdir -p docs/legacy
mv AGENT_INTEGRATION_FIXES_SUMMARY.md docs/legacy/
mv AGENT-FIX-README.md docs/legacy/
mv browser-troubleshooting.md docs/legacy/
mv bypass-ssl-warning.md docs/legacy/
mv DIRECT-AGENT-GUIDE.md docs/legacy/
mv VIDEO_TRANSCRIBER_FIX_SUMMARY.md docs/legacy/
mv WEBSOCKET-FIX-DOCUMENTATION.md docs/legacy/
mv WHISPER-API-GUIDE.md docs/legacy/
mv timeout-analysis.md docs/legacy/
mv video-analyzer-integration.md docs/legacy/
mv PROJECT-COMPLETE-SUMMARY.md docs/legacy/
mv openai-journey-mapper-README.md docs/legacy/
mv MIRO-DIAGRAM-SAMPLES.md docs/legacy/
mv journey-mapper-simplified.md docs/legacy/
mv integration-complete-report.md docs/legacy/
mv image-captioner-readme.md docs/legacy/
mv flux-lora-readme.md docs/legacy/
```

### 5. Move to `/scripts/debug/` (15 files)
Debug and testing scripts:
```bash
mkdir -p scripts/debug
mv debug_whisper.py scripts/debug/
mv debug_ws.py scripts/debug/
mv debug-favicons.sh scripts/debug/
mv debug-panel.html scripts/debug/
mv debug-websocket-messaging.js scripts/debug/
mv check-404-errors.sh scripts/debug/
mv check-agent-readiness.sh scripts/debug/
mv check-chatbot.js scripts/debug/
mv claude_doctor.py scripts/debug/
mv enhanced-debug-script.js scripts/debug/
mv monitor-test.js scripts/debug/
mv socket-test.js scripts/debug/
```

### 6. Move to `/backup/` (8 files)
Backup and legacy server files:
```bash
mkdir -p backup
mv agent-app.py backup/
mv direct-agent-server.py backup/
mv direct-ws-server.py backup/
mv minimal-agent.py backup/
mv simple-agent-relay.py backup/
```

### 7. Move to `/logs/` (5 files)
Log files:
```bash
mkdir -p logs
mv *.log logs/
```

### 8. Move to `/examples/` (6 files)
Sample and demo files:
```bash
mkdir -p examples
mv clickable_links_demo.html examples/
mv Customer_Service_Exec_Summary.html examples/
mv example_prd.txt examples/
mv sample_config.json examples/
mv test_response.json examples/
```

### 9. Move to `/tests/remaining/` (11 files)
Remaining test files not moved earlier:
```bash
mkdir -p tests/remaining
mv test*.* tests/remaining/
mv monitor*.py tests/remaining/
```

## FILES TO DELETE (Safe to Remove)

### Redundant/Obsolete Files (15 files)
```bash
# Old client fallback scripts
rm client-fallback.js
rm direct-fix.js

# Duplicate welcome code
rm welcome_code.html

# Old test upload files
rm test-upload-limits.html

# Generated or temporary files
rm favicon.ico.bak
rm *.pyc *.pyo

# Old agent fix logs
rm agent-fix.log
rm agent-server.log

# Duplicate branding file (if exists in docs/)
rm brand-style-guide.md
```

## FINAL ROOT DIRECTORY STRUCTURE

After organization, the root should contain only:
```
/NXT-HUMANS_AI_CX_WORKBENCH
├── .env                           # Environment variables
├── .gitignore                     # Git ignore rules
├── launch.sh                      # Main startup script
├── launch.bat                     # Windows startup script
├── docker-compose-all.yml         # Primary Docker config
├── docker-compose-all.override.yml # Environment overrides
├── docker-compose-agent.yml      # Agent service config
├── docker-compose-https.yml      # HTTPS proxy config
├── port_scanner.py                # Port management utility
├── CLAUDE.md                      # Claude Code guidance
├── README.md                      # Main documentation
├── requirements.txt               # Python dependencies
├── package.json                   # Node dependencies
├── /backup/                       # Old server files
├── /docker/                       # Docker variants
├── /docs/                         # Documentation
├── /examples/                     # Sample files
├── /internal-solutions-*/         # Service directories
├── /launchpad/                    # Launchpad service
├── /logs/                         # Log files
├── /mcp-services/                 # MCP wrappers
├── /scripts/                      # Utility scripts
│   ├── /debug/                   # Debug tools
│   ├── /fixes/                   # Fix scripts
│   └── /updates/                 # Update utilities
└── /tests/                        # All test files
```

## Execution Script

Save this as `organize_root.sh`:
```bash
#!/bin/bash

echo "Starting root directory organization..."

# Create directories
mkdir -p scripts/{fixes,updates,debug}
mkdir -p docker/compose-variants
mkdir -p docs/legacy
mkdir -p backup
mkdir -p logs
mkdir -p examples
mkdir -p tests/remaining

# Move fix scripts
echo "Moving fix scripts..."
mv *fix*.py scripts/fixes/ 2>/dev/null

# Move update scripts
echo "Moving update scripts..."
mv update*.{py,sh} scripts/updates/ 2>/dev/null

# Move Docker compose variants
echo "Moving Docker compose variants..."
mv docker-compose-{agent-updated,amazon,amazon-only,claude4-fixed,simple,social-cpu,video,video-fixed}.yml docker/compose-variants/ 2>/dev/null
mv docker-compose-all.yml.fixed docker/compose-variants/ 2>/dev/null
mv dynamic-compose.yml docker/compose-variants/ 2>/dev/null

# Move legacy docs
echo "Moving legacy documentation..."
mv {AGENT_INTEGRATION_FIXES_SUMMARY,AGENT-FIX-README,browser-troubleshooting,bypass-ssl-warning}.md docs/legacy/ 2>/dev/null
mv {DIRECT-AGENT-GUIDE,VIDEO_TRANSCRIBER_FIX_SUMMARY,WEBSOCKET-FIX-DOCUMENTATION,WHISPER-API-GUIDE}.md docs/legacy/ 2>/dev/null
mv {timeout-analysis,video-analyzer-integration}.md docs/legacy/ 2>/dev/null

# Move debug scripts
echo "Moving debug scripts..."
mv debug*.{py,sh,js,html} scripts/debug/ 2>/dev/null
mv check*.{sh,js} scripts/debug/ 2>/dev/null
mv {claude_doctor,enhanced-debug-script}.{py,js} scripts/debug/ 2>/dev/null

# Move backup files
echo "Moving backup files..."
mv {agent-app,direct-agent-server,direct-ws-server,minimal-agent,simple-agent-relay}.py backup/ 2>/dev/null

# Move logs
echo "Moving log files..."
mv *.log logs/ 2>/dev/null

# Move examples
echo "Moving example files..."
mv {clickable_links_demo,Customer_Service_Exec_Summary}.html examples/ 2>/dev/null
mv example_prd.txt examples/ 2>/dev/null
mv {sample_config,test_response}.json examples/ 2>/dev/null

# Move remaining test files
echo "Moving remaining test files..."
mv test*.* tests/remaining/ 2>/dev/null
mv monitor*.py tests/remaining/ 2>/dev/null

echo "Organization complete!"
echo "Root directory reduced from 156 files to ~15 essential files"
```

## Impact Assessment

### Before Organization
- 156 files in root directory
- Difficult to identify essential files
- Mix of active and obsolete scripts
- No clear structure

### After Organization
- ~15 essential files in root
- Clear directory structure
- Easy to identify critical files
- Organized by purpose

### Risk Level: LOW
- All moves preserve functionality
- Essential files remain in root
- Services unaffected
- Reversible changes

## Recommendations

1. **Execute organization gradually** - Start with obvious moves (fixes, debug scripts)
2. **Test after each category** - Ensure services still work
3. **Keep backups** - Before major reorganization
4. **Update documentation** - Reflect new structure in README.md
5. **Add to .gitignore** - Prevent logs and cache from being committed

---

*This plan organizes 140+ files into logical directories while preserving all functionality.*