import os
import subprocess
import sys

# Set the correct OpenAI API key
OPENAI_KEY = "***REDACTED-OPENAI-KEY***"

# Create a file with Python code to directly modify the modules inside the container
openai_fix = """
# Direct OpenAI key injection

import os
import sys

# Set the correct key
OPENAI_API_KEY = "{0}"
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["CHATGPT5_API_KEY"] = OPENAI_API_KEY

# Directly modify the openai module
try:
    import openai
    openai.api_key = OPENAI_API_KEY
    print(f"Direct update: Set openai.api_key = {{OPENAI_API_KEY[:8]}}...{{OPENAI_API_KEY[-4:]}}")
except ImportError:
    print("openai module not installed")

# Now directly modify our openai.py file
try:
    # First try our direct module file
    openai_file = "/app/util/llm_models/openai.py"
    if os.path.exists(openai_file):
        print(f"Found openai.py at {{openai_file}}")
        
        with open(openai_file, 'r') as f:
            content = f.read()
        
        # If there's a function called refresh_openai_api_key, replace it
        if "def refresh_openai_api_key" in content:
            import re
            print("Found refresh_openai_api_key function, replacing it")
            
            # Create a replacement function that always returns our key
            replacement_func = '''
def refresh_openai_api_key():
    """PATCHED: Always returns the correct key"""
    key = "{0}"
    # Set in environment
    os.environ["OPENAI_API_KEY"] = key
    os.environ["CHATGPT5_API_KEY"] = key
    # Set directly on the module
    import openai
    openai.api_key = key
    print(f"Using fixed OpenAI API Key: {{key[:8]}}...{{key[-4:]}}")
    return key
'''
            
            # Try to replace the function
            pattern = r'def refresh_openai_api_key\\(\\):.*?return None'
            new_content = re.sub(pattern, replacement_func.strip(), content, flags=re.DOTALL)
            
            # If the replacement worked (content changed), write it back
            if new_content != content:
                with open(openai_file, 'w') as f:
                    f.write(new_content)
                print("Successfully replaced refresh_openai_api_key function")
            else:
                print("Pattern not found exactly, appending the function instead")
                # Just append our function at the end
                with open(openai_file, 'a') as f:
                    f.write("\\n\\n" + replacement_func)
                print("Appended replacement function to the file")
        else:
            print("refresh_openai_api_key function not found, adding it")
            # Add the function at the end
            with open(openai_file, 'a') as f:
                f.write('''
# Added by fix script
def refresh_openai_api_key():
    """PATCHED: Always returns the correct key"""
    key = "{0}"
    # Set in environment
    os.environ["OPENAI_API_KEY"] = key
    os.environ["CHATGPT5_API_KEY"] = key
    # Set directly on the module
    import openai
    openai.api_key = key
    print(f"Using fixed OpenAI API Key: {{key[:8]}}...{{key[-4:]}}")
    return key
''')
    else:
        print(f"openai.py not found at {{openai_file}}")
except Exception as e:
    print(f"Error modifying openai.py: {{e}}")

# Also patch llm_provider.py to ensure our key is used
try:
    provider_file = "/app/util/llm_models/llm_provider.py"
    if os.path.exists(provider_file):
        print(f"Found llm_provider.py at {{provider_file}}")
        
        with open(provider_file, 'r') as f:
            content = f.read()
        
        # Add code at the top of the get_llm_completion function to force our key
        if "def get_llm_completion" in content:
            import re
            print("Found get_llm_completion function, patching it")
            
            # Create a patch that will be inserted at the start of the function
            patch = '''
def get_llm_completion(messages, provider=None, temperature=0.7, require_json=False):
    """PATCHED to always use the correct OpenAI API key"""
    # Force the correct OpenAI API key
    import os
    import openai
    os.environ["OPENAI_API_KEY"] = "{0}"
    os.environ["CHATGPT5_API_KEY"] = "{0}"
    openai.api_key = "{0}"
    print(f"LLM Provider: Using fixed OpenAI API Key: {{{0}[:8]}}...{{{0}[-4:]}}")
'''
            
            # Replace the original function declaration with our patched version
            pattern = r'def get_llm_completion\\(messages, provider=None, temperature=0.7, require_json=False\\):.*?\\n'
            new_content = re.sub(pattern, patch, content, count=1)
            
            # If the replacement worked (content changed), write it back
            if new_content != content:
                with open(provider_file, 'w') as f:
                    f.write(new_content)
                print("Successfully patched get_llm_completion function")
            else:
                print("Function declaration pattern not matched exactly")
                
                # Backup approach - create a patch file that will be imported
                patch_file = "/app/util/llm_models/openai_key_patch.py"
                with open(patch_file, 'w') as f:
                    f.write('''
# OpenAI API key patch
import os
import sys

# Set the correct key
os.environ["OPENAI_API_KEY"] = "{0}"
os.environ["CHATGPT5_API_KEY"] = "{0}"

# Patch the openai module directly
try:
    import openai
    openai.api_key = "{0}"
    print(f"Patched openai.api_key = {{{0}[:8]}}...{{{0}[-4:]}}")
except ImportError:
    print("openai module not found")

# Also monkey-patch __import__ to ensure openai always gets the right key
original_import = __builtins__.__import__

def patched_import(name, *args, **kwargs):
    module = original_import(name, *args, **kwargs)
    if name == "openai":
        module.api_key = "{0}"
        print(f"Import hook: Set openai.api_key = {{{0}[:8]}}...{{{0}[-4:]}}")
    return module

__builtins__.__import__ = patched_import
''')
                print(f"Created patch file at {{patch_file}}")
                
                # Make sure it gets imported by adding to __init__.py
                init_file = "/app/util/llm_models/__init__.py"
                if os.path.exists(init_file):
                    with open(init_file, 'r') as f:
                        init_content = f.read()
                    
                    # Add import if it's not already there
                    import_line = "from . import openai_key_patch  # Force correct OpenAI key\\n"
                    if "openai_key_patch" not in init_content:
                        with open(init_file, 'w') as f:
                            f.write(import_line + init_content)
                        print(f"Added import to {{init_file}}")
                    else:
                        print(f"Import already in {{init_file}}")
                else:
                    # Create the file if it doesn't exist
                    with open(init_file, 'w') as f:
                        f.write("from . import openai_key_patch  # Force correct OpenAI key\\n")
                    print(f"Created {{init_file}} with patch import")
        else:
            print("get_llm_completion function not found in llm_provider.py")
    else:
        print(f"llm_provider.py not found at {{provider_file}}")
except Exception as e:
    print(f"Error patching llm_provider.py: {{e}}")

print("OpenAI API key fix complete!")
""".format(OPENAI_KEY)

# Create a local file with this script
with open("container_openai_fix.py", "w") as f:
    f.write(openai_fix)

print("Created OpenAI fix script")

# Get container name
try:
    process = subprocess.Popen("docker ps --format '{{.Names}}' | findstr social-research-backend", 
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    stdout, stderr = process.communicate()
    container_name = stdout.decode('utf-8').strip()
    
    if not container_name:
        print("Social Research backend container not found, using default name")
        container_name = "nxt-humans_ai_cx_workbench-social-research-backend-1"
    else:
        print(f"Found container: {container_name}")
except Exception as e:
    print(f"Error finding container: {e}")
    container_name = "nxt-humans_ai_cx_workbench-social-research-backend-1"
    print(f"Using default container name: {container_name}")

# Copy the script to the container
subprocess.run(f"docker cp container_openai_fix.py {container_name}:/app/container_openai_fix.py", shell=True)
os.remove("container_openai_fix.py")
print("Copied fix script to the container")

# Run the fix in the container
print("Running fix in the container...")
subprocess.run(f"docker exec {container_name} python /app/container_openai_fix.py", shell=True)

# Now restart the services
print("\nRestarting services...")
subprocess.run("docker compose -f docker-compose-all.yml restart social-research-backend", shell=True)
print("Waiting for backend to initialize...")
import time
time.sleep(5)
print("Restarting frontend...")
subprocess.run("docker compose -f docker-compose-all.yml restart social-research-frontend", shell=True)

print("\n=========================================================")
print("OpenAI API key fix completed!")
print("The 'Ask AI' feature should now use the correct OpenAI API key:")
print(f"- OpenAI GPT-5: Using the correct key {OPENAI_KEY[:8]}...{OPENAI_KEY[-4:]}")
print("\nPlease try the 'Ask AI' feature again with the OpenAI/GPT-5 model.")
print("=========================================================")