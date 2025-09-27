@echo off
echo Testing dependencies for Amazon Market Intelligence app...
python test_dependencies.py
if %ERRORLEVEL% NEQ 0 (
    echo Dependencies test failed! Installing missing packages...
    pip install anthropic google-generativeai openai python-dotenv flask requests selectorlib
    echo Testing again after installation...
    python test_dependencies.py
)

if %ERRORLEVEL% EQU 0 (
    echo All dependencies verified! You can now run the application.
) else (
    echo Some dependencies are still missing. Please check the error messages above.
)