@echo off
echo Restarting Social Research services...
echo This will restart both frontend and backend services without disrupting other containers.

REM Stop and restart the Social Research frontend
echo.
echo Step 1: Restarting Social Research Frontend...
docker compose -f docker-compose-all.yml restart social-research-frontend
if %errorlevel% neq 0 (
    echo Error: Failed to restart social-research-frontend
    exit /b 1
)

REM Stop and restart the Social Research backend
echo.
echo Step 2: Restarting Social Research Backend...
docker compose -f docker-compose-all.yml restart social-research-backend
if %errorlevel% neq 0 (
    echo Error: Failed to restart social-research-backend
    exit /b 1
)

REM Restart the MCP service for Social Research
echo.
echo Step 3: Restarting Social Research MCP service...
docker compose -f docker-compose-all.yml restart social-mcp
if %errorlevel% neq 0 (
    echo Error: Failed to restart social-mcp
    exit /b 1
)

echo.
echo All Social Research services have been restarted successfully!
echo.
echo The services should now be accessible at:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8081
echo.
echo Please wait 10-15 seconds for all services to fully initialize.