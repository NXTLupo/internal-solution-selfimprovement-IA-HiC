#!/usr/bin/env python3
"""
Comprehensive fix for video transcriber OpenAI API key issue.
This script:
1. Creates backup files
2. Modifies key files directly
3. Injects the OpenAI API key in multiple locations
4. Validates the key is accessible
"""

import os
import subprocess
import sys
import time

# Constants
OPENAI_API_KEY = "***REDACTED-OPENAI-KEY***"
VIDEO_CONTAINER_NAME = "video-transcriptor"  # Change this if your container name is different

# Files to modify inside the container
FILES_TO_PATCH = [
    "/app/src/app.py",
    "/app/src/transcription/openai_whisper_api.py",
    "/app/src/transcription/robust_whisper_api.py",
    "/app/src/transcription/whisper_api_patch.py"
]

# Get the container ID
def get_container_id(container_name):
    try:
        container_id = subprocess.check_output(
            ["docker", "ps", "-qf", f"name={container_name}"],
            universal_newlines=True
        ).strip()
        if not container_id:
            print(f"Container '{container_name}' not found or not running.")
            print("Available containers:")
            subprocess.run(["docker", "ps"], check=True)
            return None
        return container_id
    except subprocess.CalledProcessError as e:
        print(f"Error getting container ID: {e}")
        return None

# Create a file inside the container
def create_file_in_container(container_id, file_path, content):
    temp_file = "/tmp/temp_file.txt"
    with open(temp_file, "w") as f:
        f.write(content)
    
    subprocess.run(
        ["docker", "cp", temp_file, f"{container_id}:{file_path}"],
        check=True
    )
    os.remove(temp_file)

# Patch a file inside the container by replacing or adding text
def patch_file_in_container(container_id, file_path, search_text, replace_text):
    # First, create a backup
    backup_path = f"{file_path}.bak"
    subprocess.run(
        ["docker", "exec", container_id, "cp", file_path, backup_path],
        check=True
    )
    
    # Get file content
    file_content = subprocess.check_output(
        ["docker", "exec", container_id, "cat", file_path],
        universal_newlines=True
    )
    
    # Modify content
    if search_text in file_content:
        new_content = file_content.replace(search_text, replace_text)
    else:
        # Add at the beginning of the file after imports
        import_end = file_content.find("\n\n", file_content.find("import"))
        if import_end == -1:
            import_end = file_content.find("\n", file_content.find("import"))
        
        if import_end != -1:
            new_content = (
                file_content[:import_end+2] + 
                "\n# Added by fix script\n" + replace_text + "\n\n" + 
                file_content[import_end+2:]
            )
        else:
            new_content = "# Added by fix script\n" + replace_text + "\n\n" + file_content
    
    # Write back to container
    create_file_in_container(container_id, file_path, new_content)

# Create environment file
def create_env_file(container_id, env_path):
    env_content = f"""
# Environment file created by fix script
OPENAI_API_KEY={OPENAI_API_KEY}
USE_WHISPER_API=true
"""
    create_file_in_container(container_id, env_path, env_content)

# Restart container
def restart_container(container_id):
    subprocess.run(["docker", "restart", container_id], check=True)

# Main execution
def main():
    print("=== Video Transcriptor OpenAI API Key Fix ===")
    
    # Step 1: Find the container
    container_id = get_container_id(VIDEO_CONTAINER_NAME)
    if not container_id:
        print("Looking for alternative container names...")
        for alt_name in ["video-analyzer", "video_transcriptor", "video_analyzer"]:
            container_id = get_container_id(alt_name)
            if container_id:
                print(f"Found container with name '{alt_name}'")
                break
    
    if not container_id:
        print("ERROR: Could not find the video transcriptor container.")
        print("Please make sure the container is running and try again.")
        print("If the container has a different name, edit this script.")
        return False

    print(f"Found container ID: {container_id}")
    
    # Step 2: Create .env files in multiple locations
    env_locations = [
        "/app/.env",
        "/app/src/.env",
        "/.env"
    ]
    
    for env_path in env_locations:
        print(f"Creating .env file at {env_path}")
        create_env_file(container_id, env_path)
    
    # Step 3: Patch key files
    api_key_patch = f"""
# Force set API key in environment
import os
os.environ['OPENAI_API_KEY'] = '{OPENAI_API_KEY}'
os.environ['USE_WHISPER_API'] = 'true'
print("OpenAI API Key set in environment:", os.environ.get('OPENAI_API_KEY', 'Not set')[:10] + '...')
"""

    for file_path in FILES_TO_PATCH:
        print(f"Patching file: {file_path}")
        try:
            # Check if file exists
            result = subprocess.run(
                ["docker", "exec", container_id, "ls", file_path],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print(f"  File {file_path} does not exist, skipping.")
                continue
                
            # Look for existing API key settings
            existing_key_check = subprocess.run(
                ["docker", "exec", container_id, "grep", "OPENAI_API_KEY", file_path],
                capture_output=True,
                text=True
            )
            
            if "OPENAI_API_KEY" in existing_key_check.stdout:
                # Replace existing API key setting
                print(f"  Found existing API key reference, replacing...")
                
                # Get the line with API key
                key_line = subprocess.run(
                    ["docker", "exec", container_id, "grep", "OPENAI_API_KEY", file_path],
                    capture_output=True,
                    text=True
                ).stdout.strip()
                
                # Create replacement text - maintain the same variable format
                if "os.environ" in key_line and "get" in key_line:
                    # Replace default in os.environ.get()
                    replace_line = key_line.split("=")[0] + f"= os.environ.get('OPENAI_API_KEY', '{OPENAI_API_KEY}')"
                    patch_file_in_container(container_id, file_path, key_line, replace_line)
                else:
                    # Direct assignment
                    replace_line = key_line.split("=")[0] + f"= '{OPENAI_API_KEY}'"
                    patch_file_in_container(container_id, file_path, key_line, replace_line)
            else:
                # Add new API key setting
                print(f"  No API key reference found, adding...")
                patch_file_in_container(container_id, file_path, "", api_key_patch)
        except Exception as e:
            print(f"  Error patching {file_path}: {e}")
    
    # Step 4: Create a validation script
    validation_script = """#!/usr/bin/env python3
import os
import time

# Log environment variables related to OpenAI
print("=== OpenAI API Key Validation ===")
print("OPENAI_API_KEY environment variable:", 
      "Set" if os.environ.get('OPENAI_API_KEY') else "Not set")
if os.environ.get('OPENAI_API_KEY'):
    print("Key starts with:", os.environ.get('OPENAI_API_KEY')[:10] + "...")
print("USE_WHISPER_API environment variable:", os.environ.get('USE_WHISPER_API', 'Not set'))

# Try to import and use the OpenAI client
try:
    import openai
    print("OpenAI client imported successfully")
    
    # Check if key is set in the client
    if openai.api_key:
        print("OpenAI client API key is set")
        print("Key starts with:", openai.api_key[:10] + "...")
    else:
        print("OpenAI client API key is NOT set")
        
    # Try to force set the key in the client
    openai.api_key = os.environ.get('OPENAI_API_KEY', 'NO_KEY_FOUND')
    print("After force setting, OpenAI client API key starts with:", 
          openai.api_key[:10] + "..." if openai.api_key else "Not set")
          
except ImportError:
    print("OpenAI client not installed")
except Exception as e:
    print("Error checking OpenAI client:", str(e))

# Create a marker file to show this script ran
with open("/tmp/key_validation_ran.txt", "w") as f:
    f.write(f"Validation ran at {time.time()}")

print("=== Validation Complete ===")
"""
    
    validation_path = "/app/validate_api_key.py"
    print(f"Creating validation script at {validation_path}")
    create_file_in_container(container_id, validation_path, validation_script)
    
    # Make it executable
    subprocess.run(
        ["docker", "exec", container_id, "chmod", "+x", validation_path],
        check=True
    )
    
    # Step 5: Restart the container
    print("Restarting container...")
    restart_container(container_id)
    
    # Give the container a moment to restart
    print("Waiting for container to restart...")
    time.sleep(5)
    
    # Step 6: Run the validation script
    print("Running validation script...")
    subprocess.run(
        ["docker", "exec", container_id, "python", validation_path],
        check=True
    )
    
    print("\n=== Fix Complete ===")
    print("The OpenAI API key has been added to the video transcriptor.")
    print("You can now test the transcription service at http://localhost:5002")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)