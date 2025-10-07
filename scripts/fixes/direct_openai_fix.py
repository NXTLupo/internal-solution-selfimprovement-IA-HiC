import os
import subprocess
import sys

# The correct OpenAI API key
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")

# Create a direct fix script for inside the container
direct_fix = f"""
import os
import sys

# Set the correct environment variables
os.environ["OPENAI_API_KEY"] = "{OPENAI_KEY}"
os.environ["CHATGPT5_API_KEY"] = "{OPENAI_KEY}"

# Try to directly modify the openai module
try:
    import openai
    openai.api_key = "{OPENAI_KEY}"
    print(f"Directly set openai.api_key = {OPENAI_KEY[:8]}...{OPENAI_KEY[-4:]}")
except Exception as e:
    print(f"Error setting openai module key: {e}")

# Create a file to directly patch the openai.py module
try:
    # Find the module file
    from pathlib import Path
    import importlib
    
    # Find where the openai module is located
    openai_file = None
    try:
        if 'openai' in sys.modules:
            # If already imported, get its file
            openai_spec = importlib.util.find_spec('openai')
            if openai_spec and openai_spec.origin:
                openai_file = openai_spec.origin
                print(f"Found imported openai at: {openai_file}")
    except Exception:
        pass
    
    # If not found above, look in standard locations
    if not openai_file:
        # Try to find our local project version in util/llm_models/openai.py
        potential_paths = [
            "/app/util/llm_models/openai.py",
            "./util/llm_models/openai.py",
            "../util/llm_models/openai.py",
            "../../util/llm_models/openai.py",
        ]
        
        for path in potential_paths:
            if os.path.exists(path):
                openai_file = path
                print(f"Found project openai.py at: {openai_file}")
                break
    
    # Patch the file if found
    if openai_file:
        with open(openai_file, 'r') as f:
            content = f.read()
            
        # Check if this is our util/llm_models/openai.py
        if "def refresh_openai_api_key" in content:
            # This is our module, patch the refresh function
            print("Found refresh_openai_api_key function, patching it")
            
            # Create a patched version of the function
            patched_function = f'''
def refresh_openai_api_key():
    """PATCHED to always use the correct key"""
    # Always use this specific key
    key = "{OPENAI_KEY}"
    
    # Set in environment variables
    os.environ["OPENAI_API_KEY"] = key
    os.environ["CHATGPT5_API_KEY"] = key
    
    # Set directly on the openai module
    openai.api_key = key
    
    print(f"Using PATCHED OpenAI API Key: {{key[:8]}}...{{key[-4:]}}")
    return key
'''
            
            # Use string replacement to replace the function
            import re
            pattern = r'def refresh_openai_api_key\(\).*?return None'
            # Use re.DOTALL to make . match newlines
            if re.search(pattern, content, re.DOTALL):
                new_content = re.sub(pattern, patched_function.strip(), content, flags=re.DOTALL)
                with open(openai_file, 'w') as f:
                    f.write(new_content)
                print("Successfully patched refresh_openai_api_key function")
            else:
                # If the regex didn't match, just append our function at the end
                print("Could not find the exact pattern, appending the function at the end")
                with open(openai_file, 'a') as f:
                    f.write("\n\n" + patched_function)
                print("Appended patched function to the file")
        else:
            print(f"File {openai_file} doesn't contain refresh_openai_api_key function")
    else:
        print("Could not find openai.py file to patch")
except Exception as e:
    print(f"Error patching openai.py: {e}")

# Also create a monkeypatch for the import system
monkeypatch_file = "/app/openai_monkeypatch.py"
monkeypatch_content = f'''
# This file monkeypatches the import system to ensure openai always uses our key

import sys
import os
import importlib.abc
import importlib.util

# The correct key we always want to use
OPENAI_KEY = "{OPENAI_KEY}"

# Set environment variables
os.environ["OPENAI_API_KEY"] = OPENAI_KEY
os.environ["CHATGPT5_API_KEY"] = OPENAI_KEY

# Store the original __import__ function
original_import = __import__

# Define our patched import function
def patched_import(name, *args, **kwargs):
    # Call the original import function
    module = original_import(name, *args, **kwargs)
    
    # If this is the openai module, patch it
    if name == "openai":
        # Set the API key directly
        module.api_key = OPENAI_KEY
        print(f"Import hook: Set openai.api_key = {{OPENAI_KEY[:8]}}...{{OPENAI_KEY[-4:]}}")
        
    return module

# Replace the built-in import function with our patched version
__builtins__.__import__ = patched_import
print("Installed import system hook for openai module")
'''

with open(monkeypatch_file, "w") as f:
    f.write(monkeypatch_content)
print(f"Created monkeypatch file at {monkeypatch_file}")

# Create an init_patch to ensure our monkeypatch is loaded
init_patch_file = "/app/util/llm_models/__openai_patch.py"
init_patch_content = f'''
# This file ensures our API key is always used for OpenAI
import os
import sys
import openai

# Set the correct key
CORRECT_KEY = "{OPENAI_KEY}"
os.environ["OPENAI_API_KEY"] = CORRECT_KEY
os.environ["CHATGPT5_API_KEY"] = CORRECT_KEY
openai.api_key = CORRECT_KEY

print(f"__openai_patch.py: Set openai.api_key = {{CORRECT_KEY[:8]}}...{{CORRECT_KEY[-4:]}}")
'''

with open(init_patch_file, "w") as f:
    f.write(init_patch_content)
print(f"Created init patch at {init_patch_file}")

# Update the __init__.py to import our patch
init_file = "/app/util/llm_models/__init__.py"
patch_import = "from . import __openai_patch  # Force correct OpenAI API key\\n"

if os.path.exists(init_file):
    with open(init_file, "r") as f:
        init_content = f.read()
    
    # Only add our import if it's not already there
    if "__openai_patch" not in init_content:
        with open(init_file, "w") as f:
            f.write(patch_import + init_content)
        print(f"Updated {init_file} to import our patch")
    else:
        print(f"{init_file} already imports our patch")
else:
    # Create the file if it doesn't exist
    with open(init_file, "w") as f:
        f.write(patch_import)
    print(f"Created {init_file} with our patch import")

print("Direct OpenAI key fix complete")
"""

# Get container name
try:
    result = subprocess.run(
        "docker ps --format '{{.Names}}' | findstr social-research-backend",
        shell=True, capture_output=True, text=True
    )
    container_name = result.stdout.strip()
    
    if not container_name:
        print("Social Research backend container not found, using default name")
        container_name = "nxt-humans_ai_cx_workbench-social-research-backend-1"
    else:
        print(f"Found container: {container_name}")
except Exception as e:
    print(f"Error finding container: {e}")
    container_name = "nxt-humans_ai_cx_workbench-social-research-backend-1"
    print(f"Using default container name: {container_name}")

# Write the fix to a file
with open("container_fix.py", "w") as f:
    f.write(direct_fix)

print("Created fix script")

# Copy it to the container
subprocess.run(f"docker cp container_fix.py {container_name}:/app/container_fix.py", shell=True)
os.remove("container_fix.py")
print("Copied fix script to container")

# Run the fix in the container
print("Running fix in container...")
subprocess.run(f"docker exec {container_name} python /app/container_fix.py", shell=True)

# Now restart the services
print("Restarting services...")
subprocess.run("docker compose -f docker-compose-all.yml restart social-research-backend", shell=True)
import time
time.sleep(5)
subprocess.run("docker compose -f docker-compose-all.yml restart social-research-frontend", shell=True)

print("\nFix completed! The OpenAI API key should now be correct.")
print(f"Correct key: {OPENAI_KEY[:8]}...{OPENAI_KEY[-4:]}")
print("\nPlease try the 'Ask AI' feature again with the OpenAI/GPT-5 model.")