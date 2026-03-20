@echo off
REM Windows batch script to start NXT Humans platform

echo ============================================
echo NXT HUMANS INTELLIGENCE AUGMENTATION SUITE
echo ============================================
echo.

REM Check if Docker is running
echo Checking Docker Desktop status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker Desktop is not running!
    echo.
    echo Please start Docker Desktop manually:
    echo 1. Open Docker Desktop from Start Menu or Desktop
    echo 2. Wait for it to fully initialize
    echo 3. Run this script again
    echo.
    echo If Docker Desktop is not installed, download from:
    echo https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo Docker Desktop is running.
echo.

REM Check if .env file exists
if not exist ".env" (
    echo .env file not found!
    if exist ".env.example" (
        echo Copying .env.example to .env...
        copy ".env.example" ".env"
        echo Please edit .env file with your API keys before continuing.
        pause
        exit /b 1
    ) else (
        echo No .env.example file found. Please create .env file with required API keys.
        pause
        exit /b 1
    )
)

REM Load environment variables
echo Loading environment variables...
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if not "%%a"=="" if not "%%b"=="" (
        set "%%a=%%b"
    )
)

REM Check for port conflicts using Python if available
echo Checking for port conflicts...
where python >nul 2>&1
if %errorlevel% equ 0 (
    if exist "port_scanner.py" (
        python port_scanner.py --fix >nul 2>&1
        if %errorlevel% equ 0 (
            echo Port conflicts resolved.
        )
    )
)

REM Use the correct docker-compose file
echo.
echo Starting all services using docker-compose-all.yml...
docker compose -f docker-compose-all.yml up -d

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo All services started successfully!
    echo ============================================
    echo.
    echo Service URLs:
    echo   Main Platform:     http://localhost:8000
    echo   AI Agent:          http://localhost:8500
    echo   Social Research:   http://localhost:3000
    echo   Journey Mapper:    http://localhost:8080
    echo   Video Analyzer:    http://localhost:5002
    echo.
    echo To view logs: docker compose -f docker-compose-all.yml logs -f [service-name]
    echo To stop all:  docker compose -f docker-compose-all.yml down
    echo.
) else (
    echo.
    echo Failed to start services. Please check the error messages above.
    echo.
)

pause