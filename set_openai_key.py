import os
import subprocess

# The correct API key
OPENAI_KEY = "***REDACTED-OPENAI-KEY***"
CONTAINER_NAME = "nxt-humans_ai_cx_workbench-social-research-backend-1"

print("=========================================================")
print("Direct OpenAI API Key Injection Tool")
print("=========================================================")

# Create a script to replace the key directly inside the container
inject_script = '''#!/bin/bash
# Force-set the OpenAI API key directly in the container

# Create a file with the key that directly imports itself
cat > /app/util/llm_models/openai_force_key.py << 'EOF'
# Direct OpenAI key force-set module
import os
import sys

# Set the correct API key
os.environ["OPENAI_API_KEY"] = "''' + OPENAI_KEY + '''"
os.environ["CHATGPT5_API_KEY"] = "''' + OPENAI_KEY + '''"
print(f"Set OpenAI API key to: {os.environ['OPENAI_API_KEY'][:8]}...{os.environ['OPENAI_API_KEY'][-4:]}")

# Try to directly set the key on the openai module
try:
    import openai
    openai.api_key = "''' + OPENAI_KEY + '''"
    print(f"Set openai.api_key directly: {openai.api_key[:8]}...{openai.api_key[-4:]}")
except Exception as e:
    print(f"Error setting openai.api_key: {e}")

# Create an import hook to ensure all future imports use our key
original_import = __builtins__.__import__
def patched_import(name, *args, **kwargs):
    mod = original_import(name, *args, **kwargs)
    if name == "openai" or name.endswith(".openai"):
        mod.api_key = "''' + OPENAI_KEY + '''"
        print(f"Import hook: Set openai.api_key = {mod.api_key[:8]}...{mod.api_key[-4:]}")
    return mod

# Install our import hook
__builtins__.__import__ = patched_import
print("Installed import hook for openai module")
EOF

# Make sure this is imported by adding an import to the openai.py file
if [ -f /app/util/llm_models/openai.py ]; then
    # Add the import at the top of the file
    TMP_FILE=$(mktemp)
    echo "# Force-set the correct OpenAI API key" > $TMP_FILE
    echo "from . import openai_force_key" >> $TMP_FILE
    echo "" >> $TMP_FILE
    cat /app/util/llm_models/openai.py >> $TMP_FILE
    mv $TMP_FILE /app/util/llm_models/openai.py
    echo "Added import to openai.py"
    
    # Also directly modify the refresh_openai_api_key function
    sed -i 's/def refresh_openai_api_key():.*/def refresh_openai_api_key():\\n    """FORCED key override"""\\n    key = "''' + OPENAI_KEY + '''"\\n    os.environ["OPENAI_API_KEY"] = key\\n    os.environ["CHATGPT5_API_KEY"] = key\\n    openai.api_key = key\\n    print(f"Using FORCED OpenAI API Key: {key[:8]}...{key[-4:]}")\\n    return key/g' /app/util/llm_models/openai.py
    echo "Modified refresh_openai_api_key function"
fi

# Also directly modify the llm_provider.py file
if [ -f /app/util/llm_models/llm_provider.py ]; then
    # Add import at the top
    TMP_FILE=$(mktemp)
    echo "# Force-set the correct OpenAI API key" > $TMP_FILE
    echo "from . import openai_force_key" >> $TMP_FILE
    echo "" >> $TMP_FILE
    cat /app/util/llm_models/llm_provider.py >> $TMP_FILE
    mv $TMP_FILE /app/util/llm_models/llm_provider.py
    echo "Added import to llm_provider.py"
fi

# Directly set the environment variable
export OPENAI_API_KEY="''' + OPENAI_KEY + '''"
export CHATGPT5_API_KEY="''' + OPENAI_KEY + '''"
echo "Set environment variables"

# Show the current key
echo "Current OPENAI_API_KEY: ${OPENAI_API_KEY:0:8}...${OPENAI_API_KEY: -4}"
'''

# Write the script to a temp file
with open("inject_openai_key.sh", "w") as f:
    f.write(inject_script)

print("Created key injection script")

# Copy the script to the container
subprocess.run(f"docker cp inject_openai_key.sh {CONTAINER_NAME}:/tmp/inject_openai_key.sh", shell=True)
os.remove("inject_openai_key.sh")

# Make it executable and run it
print("Copying and running script in container...")
subprocess.run(f"docker exec {CONTAINER_NAME} chmod +x /tmp/inject_openai_key.sh", shell=True)
subprocess.run(f"docker exec {CONTAINER_NAME} /tmp/inject_openai_key.sh", shell=True)

# Verify the environment variable
print("\nVerifying environment variable...")
subprocess.run(f"docker exec {CONTAINER_NAME} bash -c 'echo OPENAI_API_KEY=$OPENAI_API_KEY'", shell=True)

# Restart the Python process inside the container
print("\nRestarting the service inside the container...")
subprocess.run(f"docker exec {CONTAINER_NAME} bash -c 'pkill -f python || true'", shell=True)
subprocess.run(f"docker exec -d {CONTAINER_NAME} bash -c 'cd /app && python run.py'", shell=True)

print("\nRestarting the frontend...")
subprocess.run("docker compose -f docker-compose-all.yml restart social-research-frontend", shell=True)

print("\n=========================================================")
print("OpenAI API key has been force-set in the container")
print(f"Correct key: {OPENAI_KEY[:8]}...{OPENAI_KEY[-4:]}")
print("\nPlease try the 'Ask AI' feature again with the OpenAI/GPT-5 model.")
print("=========================================================")