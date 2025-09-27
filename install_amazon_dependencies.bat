@echo off
echo Installing dependencies for Amazon Market Intelligence container...

echo Finding container...
for /f "tokens=1" %%i in ('docker ps ^| findstr "scrapehero-amazon"') do set CONTAINER_ID=%%i

if "%CONTAINER_ID%"=="" (
    echo Amazon Market Intelligence container not found or not running.
    echo Available containers:
    docker ps
    echo.
    set /p CONTAINER_ID=Please enter the container ID manually: 
)

if "%CONTAINER_ID%"=="" (
    echo No container specified. Exiting.
    goto :error
)

echo.
echo Found container: %CONTAINER_ID%
echo.

echo Step 1: Installing required Python packages...
docker exec %CONTAINER_ID% pip install anthropic google-generativeai openai python-dotenv

echo.
echo Step 2: Verifying installation...
docker exec %CONTAINER_ID% pip list | findstr "anthropic google-generativeai openai python-dotenv"

echo.
echo Step 3: Restarting container...
docker restart %CONTAINER_ID%

echo.
echo Installation completed successfully!
echo You can now access the Amazon Market Intelligence app with full LLM Analysis features.
echo The application should be available at: http://localhost:5008
goto :end

:error
echo.
echo Installation failed. Please ensure Docker is running and the container exists.
echo.

:end
pause