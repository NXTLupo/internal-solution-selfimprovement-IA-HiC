@echo off
echo =========================================================
echo Social Research Backend Fix - API Key Issue Resolution
echo =========================================================
echo This tool will fix the API key issue in the "Ask AI" feature
echo.

REM Restart the Social Research backend
echo Step 1: Restarting Social Research Backend...
docker compose -f docker-compose-all.yml restart social-research-backend
if %errorlevel% neq 0 (
    echo Error: Failed to restart social-research-backend
    exit /b 1
)

echo.
echo Step 2: Waiting for backend to initialize...
timeout /t 10 /nobreak > nul

echo.
echo Step 3: Restarting Social Research Frontend...
docker compose -f docker-compose-all.yml restart social-research-frontend
if %errorlevel% neq 0 (
    echo Error: Failed to restart social-research-frontend
    exit /b 1
)

echo.
echo Step 4: Waiting for frontend to initialize...
timeout /t 5 /nobreak > nul

echo.
echo =========================================================
echo Fix completed successfully! 
echo.
echo The "Ask AI" feature should now be working properly with:
echo - GEMINI_API_KEY for Gemini 2.5 Pro model
echo - ANTHROPIC_API_KEY for Claude 4 model 
echo - OPENAI_API_KEY for GPT-5 model
echo.
echo If you still encounter issues, try:
echo 1. Clearing your browser cache (press Ctrl+F5)
echo 2. Opening the application in an incognito window
echo 3. Checking the browser console for errors (press F12)
echo =========================================================
echo.
echo Press any key to exit...
pause > nul