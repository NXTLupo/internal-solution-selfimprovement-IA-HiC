@echo off
echo =========================================================
echo Social Research Ask AI - Model API Key Fix
echo =========================================================
echo This tool will fix the API key issue for all models in the "Ask AI" feature
echo.

REM Get container name
for /f "tokens=*" %%a in ('docker ps --format "{{.Names}}" ^| findstr social-research-backend') do set CONTAINER_NAME=%%a

if "%CONTAINER_NAME%"=="" (
    echo Social Research backend container not found, using default name
    set CONTAINER_NAME=nxt-humans_ai_cx_workbench-social-research-backend-1
) else (
    echo Found container: %CONTAINER_NAME%
)

REM Set the correct API keys directly in the container
echo.
echo Step 1: Setting the API keys directly in the container...

REM Extract API keys from .env file
set GEMINI_API_KEY=***REDACTED-GOOGLE-KEY***
set OPENAI_API_KEY=***REDACTED-OPENAI-KEY***
set ANTHROPIC_API_KEY=***REDACTED-ANTHROPIC-KEY***

echo Setting environment variables in container...
docker exec -e GEMINI_API_KEY=%GEMINI_API_KEY% -e OPENAI_API_KEY=%OPENAI_API_KEY% -e ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY% %CONTAINER_NAME% env | findstr API_KEY

REM Create direct environment file in container
echo Creating direct environment file in container...
echo GEMINI_API_KEY=%GEMINI_API_KEY% > env_fix.txt
echo OPENAI_API_KEY=%OPENAI_API_KEY% >> env_fix.txt
echo ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY% >> env_fix.txt
echo CLAUDE_API_KEY=%ANTHROPIC_API_KEY% >> env_fix.txt
echo CLAUDE4_API_KEY=%ANTHROPIC_API_KEY% >> env_fix.txt
echo CHATGPT5_API_KEY=%OPENAI_API_KEY% >> env_fix.txt

docker cp env_fix.txt %CONTAINER_NAME%:/app/env_fix.txt
del env_fix.txt

REM Create a script to fix provider selection and API keys
echo.
echo Step 2: Creating direct fix script for API key loading...

echo import os > direct_key_fix.py
echo import sys >> direct_key_fix.py
echo import importlib.util >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Load API keys directly from file >> direct_key_fix.py
echo env_keys = {} >> direct_key_fix.py
echo with open('/app/env_fix.txt', 'r') as f: >> direct_key_fix.py
echo     for line in f: >> direct_key_fix.py
echo         if '=' in line: >> direct_key_fix.py
echo             key, value = line.strip().split('=', 1) >> direct_key_fix.py
echo             env_keys[key] = value >> direct_key_fix.py
echo             os.environ[key] = value  # Set in environment >> direct_key_fix.py
echo. >> direct_key_fix.py
echo print("Direct API key loading:") >> direct_key_fix.py
echo for key_name in ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY']: >> direct_key_fix.py
echo     key_value = env_keys.get(key_name) >> direct_key_fix.py
echo     if key_value: >> direct_key_fix.py
echo         print(f"{key_name}: {key_value[:8]}...{key_value[-4:]}") >> direct_key_fix.py
echo     else: >> direct_key_fix.py
echo         print(f"{key_name}: Not found") >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Create a direct test function for each model >> direct_key_fix.py
echo def test_gemini(): >> direct_key_fix.py
echo     try: >> direct_key_fix.py
echo         import google.generativeai as genai >> direct_key_fix.py
echo         genai.configure(api_key=env_keys.get('GEMINI_API_KEY')) >> direct_key_fix.py
echo         print(f"Gemini configured with API key: {env_keys.get('GEMINI_API_KEY')[:8]}...{env_keys.get('GEMINI_API_KEY')[-4:]}") >> direct_key_fix.py
echo         return True >> direct_key_fix.py
echo     except Exception as e: >> direct_key_fix.py
echo         print(f"Error setting up Gemini: {str(e)}") >> direct_key_fix.py
echo         return False >> direct_key_fix.py
echo. >> direct_key_fix.py
echo def test_openai(): >> direct_key_fix.py
echo     try: >> direct_key_fix.py
echo         import openai >> direct_key_fix.py
echo         openai.api_key = env_keys.get('OPENAI_API_KEY') >> direct_key_fix.py
echo         print(f"OpenAI configured with API key: {env_keys.get('OPENAI_API_KEY')[:8]}...{env_keys.get('OPENAI_API_KEY')[-4:]}") >> direct_key_fix.py
echo         return True >> direct_key_fix.py
echo     except Exception as e: >> direct_key_fix.py
echo         print(f"Error setting up OpenAI: {str(e)}") >> direct_key_fix.py
echo         return False >> direct_key_fix.py
echo. >> direct_key_fix.py
echo def test_anthropic(): >> direct_key_fix.py
echo     try: >> direct_key_fix.py
echo         import anthropic >> direct_key_fix.py
echo         client = anthropic.Anthropic(api_key=env_keys.get('ANTHROPIC_API_KEY')) >> direct_key_fix.py
echo         print(f"Anthropic configured with API key: {env_keys.get('ANTHROPIC_API_KEY')[:8]}...{env_keys.get('ANTHROPIC_API_KEY')[-4:]}") >> direct_key_fix.py
echo         return True >> direct_key_fix.py
echo     except Exception as e: >> direct_key_fix.py
echo         print(f"Error setting up Anthropic: {str(e)}") >> direct_key_fix.py
echo         return False >> direct_key_fix.py
echo. >> direct_key_fix.py
echo print("Testing each model provider directly:") >> direct_key_fix.py
echo test_gemini() >> direct_key_fix.py
echo test_openai() >> direct_key_fix.py
echo test_anthropic() >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Create a file to directly patch the module imports >> direct_key_fix.py
echo module_patch = ''' >> direct_key_fix.py
echo # This automatically patches all imports of these modules to use the correct API keys >> direct_key_fix.py
echo import sys >> direct_key_fix.py
echo import os >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Set API keys globally >> direct_key_fix.py
echo os.environ['GEMINI_API_KEY'] = '%GEMINI_API_KEY%' >> direct_key_fix.py
echo os.environ['OPENAI_API_KEY'] = '%OPENAI_API_KEY%' >> direct_key_fix.py
echo os.environ['ANTHROPIC_API_KEY'] = '%ANTHROPIC_API_KEY%' >> direct_key_fix.py
echo os.environ['CLAUDE_API_KEY'] = '%ANTHROPIC_API_KEY%' >> direct_key_fix.py
echo os.environ['CLAUDE4_API_KEY'] = '%ANTHROPIC_API_KEY%' >> direct_key_fix.py
echo os.environ['CHATGPT5_API_KEY'] = '%OPENAI_API_KEY%' >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Patch modules on import >> direct_key_fix.py
echo class PatchedImporter: >> direct_key_fix.py
echo     def __init__(self): >> direct_key_fix.py
echo         self.old_import = __builtins__.__import__ >> direct_key_fix.py
echo. >> direct_key_fix.py
echo     def __call__(self, name, *args, **kwargs): >> direct_key_fix.py
echo         module = self.old_import(name, *args, **kwargs) >> direct_key_fix.py
echo. >> direct_key_fix.py
echo         # Patch imported modules >> direct_key_fix.py
echo         if name == 'google.generativeai': >> direct_key_fix.py
echo             print("Patching google.generativeai with direct API key") >> direct_key_fix.py
echo             module.configure(api_key=os.environ['GEMINI_API_KEY']) >> direct_key_fix.py
echo         elif name == 'openai': >> direct_key_fix.py
echo             print("Patching openai with direct API key") >> direct_key_fix.py
echo             module.api_key = os.environ['OPENAI_API_KEY'] >> direct_key_fix.py
echo         elif name == 'anthropic': >> direct_key_fix.py
echo             print("Anthropic import detected - API key will be used on client initialization") >> direct_key_fix.py
echo. >> direct_key_fix.py
echo         return module >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Replace the built-in import function with our patched version >> direct_key_fix.py
echo __builtins__.__import__ = PatchedImporter() >> direct_key_fix.py
echo print("Module patching complete - API keys will be injected on import") >> direct_key_fix.py
echo ''' >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Write the patch file >> direct_key_fix.py
echo with open('/app/util/patched_imports.py', 'w') as f: >> direct_key_fix.py
echo     f.write(module_patch) >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Create the __init__.py patch to automatically load the patch >> direct_key_fix.py
echo init_patch = ''' >> direct_key_fix.py
echo # Import patched_imports to set API keys globally >> direct_key_fix.py
echo try: >> direct_key_fix.py
echo     from . import patched_imports >> direct_key_fix.py
echo     print("API key patching applied") >> direct_key_fix.py
echo except Exception as e: >> direct_key_fix.py
echo     print(f"Error applying API key patch: {e}") >> direct_key_fix.py
echo ''' >> direct_key_fix.py
echo. >> direct_key_fix.py
echo # Check if util/__init__.py exists, and add the import if it does >> direct_key_fix.py
echo import os >> direct_key_fix.py
echo init_path = '/app/util/__init__.py' >> direct_key_fix.py
echo if os.path.exists(init_path): >> direct_key_fix.py
echo     with open(init_path, 'r') as f: >> direct_key_fix.py
echo         content = f.read() >> direct_key_fix.py
echo     if 'patched_imports' not in content: >> direct_key_fix.py
echo         with open(init_path, 'w') as f: >> direct_key_fix.py
echo             f.write(init_patch + '\n' + content) >> direct_key_fix.py
echo             print("Updated util/__init__.py to import patches") >> direct_key_fix.py
echo     else: >> direct_key_fix.py
echo         print("util/__init__.py already imports patches") >> direct_key_fix.py
echo else: >> direct_key_fix.py
echo     with open(init_path, 'w') as f: >> direct_key_fix.py
echo         f.write(init_patch) >> direct_key_fix.py
echo     print("Created util/__init__.py with patch import") >> direct_key_fix.py
echo. >> direct_key_fix.py
echo print("API key fix completed - all models will use the correct API keys") >> direct_key_fix.py

docker cp direct_key_fix.py %CONTAINER_NAME%:/app/direct_key_fix.py
del direct_key_fix.py

echo.
echo Step 3: Running fix in container...
docker exec %CONTAINER_NAME% python /app/direct_key_fix.py

echo.
echo Step 4: Restarting services...
docker compose -f docker-compose-all.yml restart social-research-backend
timeout /t 5 /nobreak > nul
docker compose -f docker-compose-all.yml restart social-research-frontend

echo.
echo =========================================================
echo Fix completed! 
echo.
echo The "Ask AI" feature should now use the correct API keys:
echo - Gemini 2.5 Pro: Using GEMINI_API_KEY=%GEMINI_API_KEY:~0,8%...%GEMINI_API_KEY:~-4%
echo - OpenAI GPT-5: Using OPENAI_API_KEY=%OPENAI_API_KEY:~0,8%...%OPENAI_API_KEY:~-4%
echo - Claude 4: Using ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY:~0,8%...%ANTHROPIC_API_KEY:~-4%
echo.
echo Please try the "Ask AI" feature again.
echo =========================================================
echo.
pause