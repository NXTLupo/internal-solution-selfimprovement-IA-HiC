# Claude 4 Journey Mapper Integration Fix

## Issue Overview

The Claude 4 Journey Mapper service is already included in the codebase and properly configured in the templates (`enhanced-index.html` and `status-enhanced.html`), but it might not be visible in the launchpad interface due to one or more of the following issues:

1. The workbench might be using the original `docker-compose-all.yml` instead of the fixed version (`docker-compose-all.yml.fixed`) that includes the Claude 4 Journey Mapper service
2. The API keys might not be properly propagated to the Claude 4 Journey Mapper container
3. There might be port conflicts preventing the service from starting
4. The Docker network might not be configured correctly

## Solution

A fix script (`fix-claude4-integration.sh`) has been created to address these issues. This script:

1. Verifies that all required components are present
2. Stops all running services
3. Frees up the required ports
4. Creates a Docker Compose override file with the necessary API keys
5. Copies the fixed Docker Compose file to be the main one
6. Starts all services with the fixed configuration

## How to Run the Fix

1. Open a terminal and navigate to the workbench directory:
   ```bash
   cd "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH"
   ```

2. Run the fix script:
   ```bash
   ./fix-claude4-integration.sh
   ```

3. Wait for the script to complete. It will display the status of each step and provide information about accessing the services.

4. Access the launchpad at http://localhost:8000 and you should see the Claude 4 Journey Mapper card in the Data Analysis Tools section.

## Verifying the Fix

To verify that the Claude 4 Journey Mapper is properly integrated:

1. Open the launchpad at http://localhost:8000
2. Look for the "Journey Mapper (Claude 4)" card in the Data Analysis Tools section
3. Click the "Launch" button to access the Claude 4 Journey Mapper
4. You should be able to upload files and generate journey maps using Claude 4

## Troubleshooting

If you still don't see the Claude 4 Journey Mapper in the launchpad after running the fix script:

1. Clear your browser cache or use an incognito window
2. Check the launchpad container logs:
   ```bash
   docker logs nxthumans_ai_cx_workbench-launchpad-1
   ```
3. Check the Claude 4 Journey Mapper container logs:
   ```bash
   docker logs nxthumans_ai_cx_workbench-claude4-journey-mapper-1
   ```
4. Verify that all services are running:
   ```bash
   docker ps
   ```
5. Check if the Claude 4 Journey Mapper is accessible directly at http://localhost:8095

## Technical Details

The Claude 4 Journey Mapper consists of:

1. The main service (`claude4-journey-mapper`) that runs on port 8095
2. The MCP wrapper service (`claude4-journey-mcp`) that runs on port 8506 and provides an API for the agent to interact with the Journey Mapper

Both services are included in the `docker-compose-all.yml.fixed` file and are properly referenced in the launchpad templates.

The updated Docker Compose configuration ensures that:
- All services use the appropriate API keys
- The Claude 4 Journey Mapper uses the Claude 4 model (anthropic.claude-sonnet-4-20250514-v1:0)
- All services are connected to the same Docker network