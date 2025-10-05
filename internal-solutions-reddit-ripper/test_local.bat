@echo off
REM Test Social Data Collector locally on Windows

echo Starting Social Data Collector in test mode...
echo.

REM Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Run the unified app
echo.
echo Starting unified Social Data Collector on http://localhost:5001
echo Press Ctrl+C to stop
echo.

set PORT=5001
set FLASK_DEBUG=True
python app_unified.py

pause