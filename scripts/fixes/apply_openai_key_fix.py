import os
import subprocess
import sys

# Get the correct API keys
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

print("=========================================================")
print("Social Research Ask AI - OpenAI API Key Fix (Python Version)")
print("=========================================================")

# Get container name
try:
    result = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}", "--filter", "name=social-research-backend"],
        capture_output=True,
        text=True
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

# Create OpenAI direct fix script content
openai_fix_content = f"""
# Direct OpenAI key fix
import os
import sys
import openai

# Set the correct key
CORRECT_KEY = "{OPENAI_KEY}"

# Set environment variables
os.environ["OPENAI_API_KEY"] = CORRECT_KEY
os.environ["CHATGPT5_API_KEY"] = CORRECT_KEY

# Set the API key directly on the module
openai.api_key = CORRECT_KEY

print(f"OpenAI API key set directly to: {{CORRECT_KEY[:8]}}...{{CORRECT_KEY[-4:]}}")

# Override the refresh function in the local openai.py
def patch_openai_module():
    try:
        openai_file = "/app/util/llm_models/openai.py"
        with open(openai_file, 'r') as f:
            content = f.read()
        
        # Add direct key setting to the file
        if "def refresh_openai_api_key" in content:
            # Find the function and replace it with one that always returns our key
            import re
            pattern = r'def refresh_openai_api_key\\(\\):\\s+[^\\S\\r\\n]*.*?return None'
            replacement = f'''def refresh_openai_api_key():
    # Always use the correct key - PATCHED
    key = "{OPENAI_KEY}"
    os.environ["OPENAI_API_KEY"] = key
    os.environ["CHATGPT5_API_KEY"] = key
    openai.api_key = key
    print(f"Using fixed OpenAI API Key: {{key[:8]}}...{{key[-4:]}}")
    return key'''
            
            # Use re.DOTALL to make . match newlines
            new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
            if new_content != content:
                with open(openai_file, 'w') as f:
                    f.write(new_content)
                print("Successfully replaced refresh_openai_api_key function")
            else:
                print("Could not find and replace the refresh_openai_api_key function pattern")
                
                # Backup approach - just append the function at the end of the file
                addition = f'''
# PATCHED refresh function that always returns the correct key
def refresh_openai_api_key():
    # Always use the correct key - PATCHED
    key = "{OPENAI_KEY}"
    os.environ["OPENAI_API_KEY"] = key
    os.environ["CHATGPT5_API_KEY"] = key
    openai.api_key = key
    print(f"Using fixed OpenAI API Key: {{key[:8]}}...{{key[-4:]}}")
    return key
'''
                with open(openai_file, 'a') as f:
                    f.write(addition)
                print("Added patched refresh_openai_api_key function at the end of the file")
        else:
            print("Could not find refresh_openai_api_key function in file")
    
    except Exception as e:
        print(f"Error modifying openai.py: {e}")

# Also patch the llm_provider.py
def patch_llm_provider():
    try:
        provider_file = "/app/util/llm_models/llm_provider.py"
        with open(provider_file, 'r') as f:
            content = f.read()
        
        # Add code to ensure our key is always used
        if "# OPENAI KEY PATCH" not in content:
            # Find where the providers are being checked
            if "def get_llm_completion" in content:
                # Add our patch right at the start of the function
                import re
                pattern = r'def get_llm_completion\\([^)]*\\):\\s*'
                patch = f'''def get_llm_completion\\1:
    # OPENAI KEY PATCH - Always use the correct key
    import os
    import openai
    CORRECT_KEY = "{OPENAI_KEY}"
    os.environ["OPENAI_API_KEY"] = CORRECT_KEY
    os.environ["CHATGPT5_API_KEY"] = CORRECT_KEY
    openai.api_key = CORRECT_KEY
    print(f"LLM Provider: Using correct OpenAI key: {{CORRECT_KEY[:8]}}...{{CORRECT_KEY[-4:]}}")
    '''
                new_content = re.sub(pattern, patch, content)
                
                with open(provider_file, 'w') as f:
                    f.write(new_content)
                print("Successfully patched llm_provider.py to always use the correct OpenAI key")
            else:
                print("Could not find the get_llm_completion function in llm_provider.py")
        else:
            print("llm_provider.py is already patched")
            
    except Exception as e:
        print(f"Error patching llm_provider.py: {e}")

patch_openai_module()
patch_llm_provider()
print("OpenAI key fix applied!")
"""

# Write the fix script to a file
with open("openai_direct_fix.py", "w") as f:
    f.write(openai_fix_content)

print("Step 1: Created OpenAI API key fix script")

# Copy the script to the container
subprocess.run(["docker", "cp", "openai_direct_fix.py", f"{container_name}:/app/openai_direct_fix.py"])
os.remove("openai_direct_fix.py")

print("Step 2: Copied fix script to container")

# Execute the script in the container
print("Step 3: Running fix script in container...")
subprocess.run(["docker", "exec", container_name, "python", "/app/openai_direct_fix.py"])

# Verify the environment variables
print("\nStep 4: Verifying environment variables...")
subprocess.run(["docker", "exec", container_name, "env", "|", "grep", "OPENAI"])

# Restart the services
print("\nStep 5: Restarting services...")
subprocess.run(["docker", "compose", "-f", "docker-compose-all.yml", "restart", "social-research-backend"])
print("Waiting for backend to initialize...")
import time
time.sleep(5)
subprocess.run(["docker", "compose", "-f", "docker-compose-all.yml", "restart", "social-research-frontend"])

print("\n=========================================================")
print("OpenAI API Key fix completed!")
print("The 'Ask AI' feature should now use the correct OpenAI API key:")
print(f"- OpenAI GPT-5: Using the correct key {OPENAI_KEY[:8]}...{OPENAI_KEY[-4:]}")
print("\nPlease try the 'Ask AI' feature again with the OpenAI/GPT-5 model.")
print("=========================================================")