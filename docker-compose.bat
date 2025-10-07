@echo off
REM This wrapper ensures correct API keys are always used from .env file

REM Clear any existing OPENAI_API_KEY from environment
set OPENAI_API_KEY=

REM Load correct keys from .env file
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="OPENAI_API_KEY" set OPENAI_API_KEY=%%b
    if "%%a"=="ANTHROPIC_API_KEY" set ANTHROPIC_API_KEY=%%b
    if "%%a"=="GEMINI_API_KEY" set GEMINI_API_KEY=%%b
)

REM Verify correct key is loaded
echo Using OpenAI API Key ending with: %OPENAI_API_KEY:~-4%

REM Run docker compose with all arguments passed to this script
docker compose %*