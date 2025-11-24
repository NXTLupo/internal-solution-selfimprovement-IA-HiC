@echo off
setlocal enabledelayedexpansion

:: NXT HUMANS WORKBENCH LAUNCHER FOR WINDOWS
echo.
echo ================================================================================
echo NXT HUMANS INTELLIGENCE AUGMENTATION SUITE - WINDOWS LAUNCHER
echo ================================================================================
echo.

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo [OK] Docker is running.

:: Check for .env file
if not exist .env (
    echo [ERROR] No .env file found! Please create one with your API keys.
    pause
    exit /b 1
)
echo [OK] .env file found.

:: Load environment variables from .env file
echo [INFO] Loading environment variables...
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if not "%%a"=="" if not "%%b"=="" (
        set "%%a=%%b"
    )
)

:: Verify API keys
if "%ANTHROPIC_API_KEY%"=="" (
    echo [ERROR] ANTHROPIC_API_KEY is not set in .env file!
    pause
    exit /b 1
)
if "%OPENAI_API_KEY%"=="" (
    echo [ERROR] OPENAI_API_KEY is not set in .env file!
    pause
    exit /b 1
)
echo [OK] API keys loaded.

:: Kill processes on common ports (Windows-specific)
echo [INFO] Checking for port conflicts...
for %%p in (3000 5001 5002 5003 8000 8080 8081 8095 8500 8501 8502 8503 8504 8506) do (
    netstat -ano | findstr :%%p >nul 2>&1
    if !errorlevel! equ 0 (
        echo [WARNING] Port %%p is in use. Attempting to free it...
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
            if not "%%a"=="0" (
                taskkill /PID %%a /F >nul 2>&1
            )
        )
    )
)
echo [OK] Ports checked.

:: Stop any existing containers
echo [INFO] Stopping existing containers...
docker compose -f docker-compose-all.yml down >nul 2>&1
docker container prune -f >nul 2>&1
echo [OK] Existing containers stopped.

:: Rebuild Social Research frontend with dependencies
echo [INFO] Building Social Research frontend with fresh dependencies...
echo       This may take 60-90 seconds on first run...
docker compose -f docker-compose-all.yml build --no-cache social-research-frontend
if %errorlevel% neq 0 (
    echo [WARNING] Frontend build had issues but continuing...
)

:: Start all services
echo [INFO] Starting all services...
docker compose -f docker-compose-all.yml up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services. Check Docker logs for details.
    pause
    exit /b 1
)

:: Wait for services to initialize
echo [INFO] Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

:: Check service health
echo.
echo [INFO] Checking service health...
echo.

:: Check Launchpad
curl -s -f http://localhost:8000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK]   Launchpad Hub:           http://localhost:8000
) else (
    echo [WAIT] Launchpad Hub:           Starting...
)

:: Check Social Research
curl -s -f http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK]   Social Research:         http://localhost:3000
) else (
    echo [WAIT] Social Research:         Starting (may take 60-90 seconds)...
)

:: Check other critical services
curl -s -f http://localhost:8080 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK]   Journey Mapper:          http://localhost:8080
) else (
    echo [WAIT] Journey Mapper:          Starting...
)

curl -s -f http://localhost:5001 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK]   Reddit Ripper:           http://localhost:5001
) else (
    echo [WAIT] Reddit Ripper:           Starting...
)

curl -s -f http://localhost:5002 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK]   Video Analyzer:          http://localhost:5002
) else (
    echo [WAIT] Video Analyzer:          Starting...
)

:: Display summary
echo.
echo ================================================================================
echo ALL SERVICES HAVE BEEN STARTED!
echo ================================================================================
echo.
echo Primary URLs:
echo   Launchpad Hub:              http://localhost:8000
echo   Social Research Analytics:  http://localhost:3000
echo   Journey Mapper (Claude 3.7): http://localhost:8080
echo   Journey Mapper (Claude 4):  http://localhost:8095
echo   Reddit Data Collector:      http://localhost:5001
echo   Video Analyzer:             http://localhost:5002
echo   LinkedIn Generator:         http://localhost:5003
echo.
echo To monitor logs:
echo   docker compose -f docker-compose-all.yml logs -f [service-name]
echo.
echo To stop all services:
echo   docker compose -f docker-compose-all.yml down
echo.
echo NOTE: Social Research may take 60-90 seconds to fully start on first run.
echo       If it doesn't load, wait a moment and refresh the page.
echo.
pause