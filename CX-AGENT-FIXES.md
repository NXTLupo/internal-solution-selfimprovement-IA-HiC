# Agent Integration Fixes

This document summarizes the fixes implemented for the NXT HUMANS CX WORKBENCH agent integration based on the agent-integration-guide.md documentation and analysis of actual code issues.

## Key Issues Addressed

1. **Parameter Naming Consistency**
   - Fixed critical parameter naming inconsistency between the agent and journey-mcp
   - Implemented bidirectional parameter conversion to support both "file_id" and "file" parameters in multiple places:
     - In agent.py: Converting "file" to "file_id"
     - In journey-mcp/app.py: Added support for both parameters in journey.upload_file AND journey.generate_map
   - Updated tool schema to document the required parameters explicitly
   - Added warning in parameter descriptions stating which parameter is REQUIRED

2. **Reddit Tool Naming Inconsistency**
   - Fixed critical tool naming mismatch between the agent system prompt and Reddit MCP
   - Added tool aliases in the Reddit MCP:
     - `reddit_collect_data` → alias for `reddit.search`
     - `reddit.collect_posts` → alias for `reddit.search`
     - `reddit.get_subreddit_posts` → alias for `reddit.search`
     - `reddit.generate_pdf` → alias for `reddit.search` (with PDF-specific defaults)
     - `reddit_get_job_status` → alias for `reddit.get_status`
   - Implemented corresponding API endpoint handlers for all alias names
   - Added detailed logging to track which tool names are being used

3. **WebSocket Connection Stability**
   - Implemented the recommended WebSocket proxy pattern from the integration guide
   - Added proper error handling, reconnection logic, and status tracking
   - Improved thread management to prevent resource leaks

4. **System Prompt Engineering**
   - Replaced the existing system prompt with the recommended version from the integration guide
   - Added clear workflow instructions for each tool
   - Removed nested JSON examples that were causing confusion
   - Added explicit section for PDF generation using `reddit.generate_pdf` tool
   - Provided detailed instructions for when to use specific Reddit tools

5. **API Endpoint Mapping**
   - Updated journey-mcp to use the correct endpoint in Journey Mapper (/api/analyze)
   - Fixed status tracking for asynchronous jobs
   - Implemented better job caching mechanism

6. **Container Networking**
   - Created docker-compose.override.yml with proper network configuration
   - Added extra_hosts setting to ensure DNS resolution works correctly
   - Added health checks for all services

## Files Modified

- `/mcp-services/agent/app.py`: Updated system prompt and parameter handling
- `/mcp-services/journey-mcp/app.py`: Added support for "file_id" parameter and correct endpoint mapping
- `/mcp-services/reddit-mcp/app.py`: Added tool name aliases and corresponding endpoint handlers
- `/launchpad/app.py`: Implemented robust WebSocket proxy
- Added new files:
  - `debug.sh`: Diagnostics script to troubleshoot integration issues
  - `docker-compose.override.yml`: Container networking configuration

## Root Cause Analysis

### Parameter Naming Inconsistency

The parameter naming inconsistency was identified through WebSocket message logs:

```
[12:21:55 PM] RECEIVED: {"type":"message","content":"I apologize for the error. It seems there was an issue with the paramet...
[12:21:49 PM] SENDING: {"type":"message","content":"do it now! Keep me informed"}...
[12:21:35 PM] RECEIVED: {"type":"message","content":"Great! The file has been successfully uploaded to the Journey Mapper to...
[12:21:30 PM] SENDING: {"type":"file","content":"Upload this file to the journeymapping tool and generate a journey map. Na...
```

The agent was sending a parameter named "file_id" which was expected but journey-mcp wasn't handling it correctly:

1. WebSocket connection initially worked, but failed when trying to upload and process files
2. The agent expected to use "file_id" but the journey-mcp was expecting "file"
3. The journey-mcp/app.py was not properly handling "file_id" when it was passed directly
4. The agent was not consistently checking for both parameter naming patterns

### Reddit Tool Naming Inconsistency

Further WebSocket logs revealed that Claude was attempting to use Reddit tool names that didn't exist in the Reddit MCP service:

```
[12:23:15 PM] RECEIVED: {"type":"message","content":"I apologize for the confusion. It appears that both Reddit data collect...
[12:23:10 PM] SENDING: {"type":"message","content":"Can you show me collected data from r/StableDiffusion from the past week?"}...
```

The analysis of logs showed:

1. Claude was attempting to use `reddit_collect_data` and `reddit.get_subreddit_posts` as tool names
2. These tools were mentioned in the system prompt (in section "## REDDIT DATA COLLECTION")
3. However, the Reddit MCP service only implemented `reddit.search`, not these aliases
4. This created a fundamental mismatch between Claude's expectations and available tools
5. The fix required adding these tool names as aliases to the existing functionality

## Testing and Verification

To verify the fixes, run the following commands:

```bash
# Apply the Reddit MCP fix
cd /Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/mcp-services/reddit-mcp/
cp app.py app.py.original
cp app.py.fixed app.py

# Make debug script executable
chmod +x /Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/debug.sh

# Start services with the new configuration
docker-compose -f dynamic-compose.yml up -d

# Run the debug script to check connections
./debug.sh
```

### Parameter Naming Consistency Test

Test file uploading and journey mapping:
1. Upload a file via the chatbot
2. Ask the agent to generate a journey map using the uploaded file
3. Verify that both upload and generation work correctly

Expected outcome:
- The agent should properly handle file uploads with consistent parameter naming
- Journey mapping should work regardless of whether "file_id" or "file" parameter is used
- The agent should maintain state for long-running processes

### Reddit Tool Naming Test

Test Reddit data collection:
1. Ask "Can you collect data from the StableDiffusion subreddit from the past week?"
2. Alternatively, try "Get Reddit posts from r/AskReddit for the last month"
3. For PDF generation specifically, try "Generate a PDF of the last 100 posts on the StableDiffusion subreddit"

Expected outcome:
- The agent should successfully use any of the aliased tool names
- Data collection should work properly with any variation of the tool name
- PDF generation should work directly with the reddit.generate_pdf tool
- Job status tracking should work correctly
- The agent should follow the system prompt instructions for tool selection

### Overall WebSocket Test

Monitor the WebSocket traffic using Chrome DevTools:
1. Open Chrome DevTools (F12) and select the Network tab
2. Filter for "WS" to show only WebSocket connections
3. Send messages and verify proper communication

Expected outcome:
- WebSocket connections should remain stable
- No 1006 error codes should appear
- Tool invocations should succeed with proper parameters

## Remaining Considerations

### Journey Mapper Integration
- The fix assumes that `journey-mapper:8000` is the correct endpoint for the Journey Mapper service
- The journey mapping functionality may need further testing with various file types

### Reddit Tool Naming
- The alias-based approach maintains backward compatibility but increases maintenance complexity
- Long-term, it would be better to standardize the system prompt and tool names
- The logging added to the Reddit MCP will help identify which tool names are most commonly used

### System Prompt Maintenance
- The system prompt should be periodically reviewed and updated as new tools are added
- Any changes to the system prompt should be carefully synchronized with MCP implementations
- Tools mentioned in the system prompt must have corresponding implementations in MCP services

### Deployment Environment
- Container IP addresses may need to be updated in the override file depending on the deployment environment
- The URL transformation for Reddit file downloads may need adjustments in different environments
- The debug.sh script should be maintained as new services are added

### Next Steps
1. Apply similar fixes to the Social MCP service if needed
2. Add comprehensive testing to verify all tool chains end-to-end
3. Create a documentation process to ensure new tools are consistently named across the system prompt and MCP implementations