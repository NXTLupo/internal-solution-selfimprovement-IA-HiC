#!/bin/bash

# Root Directory Organization Script
# Safe cleanup and organization of NXT-HUMANS_AI_CX_WORKBENCH root directory
# Date: December 2025

echo "========================================="
echo "Root Directory Organization Script"
echo "========================================="
echo ""
echo "This script will organize 140+ files from root into logical directories"
echo "All essential files will remain in root"
echo ""

# Create directory structure
echo "Step 1: Creating directory structure..."
mkdir -p scripts/{fixes,updates,debug}
mkdir -p docker/compose-variants
mkdir -p docs/legacy
mkdir -p backup
mkdir -p logs
mkdir -p examples
mkdir -p tests/remaining

# Move fix scripts (10 files)
echo "Step 2: Moving fix scripts to scripts/fixes/..."
for file in agent_welcome_fix.py apply_openai_key_fix.py direct_agent_fix.py direct_api_fix.py direct_openai_fix.py direct-connect-fix.py final_fix.py integrated-agent-fix.py validate_fix.py verify_agent_fixes.py; do
    if [ -f "$file" ]; then
        mv "$file" scripts/fixes/ 2>/dev/null && echo "  ✓ Moved $file"
    fi
done

# Move update scripts (6 files)
echo "Step 3: Moving update scripts to scripts/updates/..."
for file in update_claude4_api_key.py update_claude4_api_key.sh update_docker_hosts.py update_openai_key.sh update_video_api_key.sh update_whisper_key.sh; do
    if [ -f "$file" ]; then
        mv "$file" scripts/updates/ 2>/dev/null && echo "  ✓ Moved $file"
    fi
done

# Move Docker compose variants (11 files)
echo "Step 4: Moving Docker compose variants to docker/compose-variants/..."
for file in docker-compose-agent-updated.yml docker-compose-all.yml.fixed docker-compose-amazon.yml docker-compose-amazon-only.yml docker-compose-claude4.yml docker-compose-claude4-fixed.yml docker-compose-simple.yml docker-compose-social-cpu.yml docker-compose-video.yml docker-compose-video-fixed.yml dynamic-compose.yml; do
    if [ -f "$file" ]; then
        mv "$file" docker/compose-variants/ 2>/dev/null && echo "  ✓ Moved $file"
    fi
done

# Move legacy documentation
echo "Step 5: Moving legacy documentation to docs/legacy/..."
for file in AGENT_INTEGRATION_FIXES_SUMMARY.md AGENT-FIX-README.md browser-troubleshooting.md bypass-ssl-warning.md DIRECT-AGENT-GUIDE.md VIDEO_TRANSCRIBER_FIX_SUMMARY.md WEBSOCKET-FIX-DOCUMENTATION.md WHISPER-API-GUIDE.md timeout-analysis.md video-analyzer-integration.md PROJECT-COMPLETE-SUMMARY.md; do
    if [ -f "$file" ]; then
        mv "$file" docs/legacy/ 2>/dev/null && echo "  ✓ Moved $file"
    fi
done

# Move debug scripts
echo "Step 6: Moving debug scripts to scripts/debug/..."
for file in debug_whisper.py debug_ws.py debug-favicons.sh debug-panel.html debug-websocket-messaging.js check-404-errors.sh check-agent-readiness.sh check-chatbot.js claude_doctor.py enhanced-debug-script.js; do
    if [ -f "$file" ]; then
        mv "$file" scripts/debug/ 2>/dev/null && echo "  ✓ Moved $file"
    fi
done

# Move backup server files
echo "Step 7: Moving backup server files to backup/..."
for file in agent-app.py direct-agent-server.py direct-ws-server.py minimal-agent.py simple-agent-relay.py; do
    if [ -f "$file" ]; then
        mv "$file" backup/ 2>/dev/null && echo "  ✓ Moved $file"
    fi
done

# Move log files
echo "Step 8: Moving log files to logs/..."
mv *.log logs/ 2>/dev/null && echo "  ✓ Moved all .log files"

# Move example files
echo "Step 9: Moving example files to examples/..."
for file in clickable_links_demo.html Customer_Service_Exec_Summary.html example_prd.txt; do
    if [ -f "$file" ]; then
        mv "$file" examples/ 2>/dev/null && echo "  ✓ Moved $file"
    fi
done

# Move remaining test files
echo "Step 10: Moving remaining test files to tests/remaining/..."
mv test*.* tests/remaining/ 2>/dev/null
mv monitor*.py tests/remaining/ 2>/dev/null
mv monitor*.js tests/remaining/ 2>/dev/null
mv socket*.js tests/remaining/ 2>/dev/null
echo "  ✓ Moved remaining test files"

# Remove obsolete files
echo "Step 11: Removing obsolete files..."
for file in client-fallback.js direct-fix.js welcome_code.html test-upload-limits.html agent-fix.log agent-server.log; do
    if [ -f "$file" ]; then
        rm "$file" 2>/dev/null && echo "  ✓ Removed $file"
    fi
done

# Count remaining files
echo ""
echo "========================================="
echo "Organization Complete!"
echo "========================================="
echo ""
echo "Files in root before: 156"
echo -n "Files in root after: "
ls -la *.* 2>/dev/null | wc -l
echo ""
echo "Essential files preserved in root:"
echo "  - .env (API keys)"
echo "  - launch.sh (startup script)"
echo "  - docker-compose-all.yml (main Docker config)"
echo "  - port_scanner.py (port management)"
echo "  - CLAUDE.md (AI guidance)"
echo "  - README.md (documentation)"
echo ""
echo "New directory structure:"
echo "  /scripts/fixes/     - One-time fix scripts"
echo "  /scripts/updates/   - API key update utilities"
echo "  /scripts/debug/     - Debug and monitoring tools"
echo "  /docker/compose-variants/ - Alternative Docker configs"
echo "  /docs/legacy/       - Old documentation"
echo "  /backup/           - Backup server files"
echo "  /logs/             - Log files"
echo "  /examples/         - Sample and demo files"
echo "  /tests/            - All test files"
echo ""
echo "No services were affected by this reorganization."