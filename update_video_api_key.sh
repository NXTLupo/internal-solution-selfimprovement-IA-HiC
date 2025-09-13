#!/bin/bash
#
# Enhanced script to update the OpenAI API key for the Video Transcriber service
# 
# Usage: ./update_video_api_key.sh YOUR_OPENAI_API_KEY

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${BLUE}${BOLD}"
echo "██╗   ██╗██╗██████╗ ███████╗ ██████╗     ████████╗██████╗  █████╗ ███╗   ██╗███████╗ ██████╗██████╗ ██╗██████╗ ████████╗ ██████╗ ██████╗ "
echo "██║   ██║██║██╔══██╗██╔════╝██╔═══██╗    ╚══██╔══╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██╔════╝██╔══██╗██║██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗"
echo "██║   ██║██║██║  ██║█████╗  ██║   ██║       ██║   ██████╔╝███████║██╔██╗ ██║███████╗██║     ██████╔╝██║██████╔╝   ██║   ██║   ██║██████╔╝"
echo "╚██╗ ██╔╝██║██║  ██║██╔══╝  ██║   ██║       ██║   ██╔══██╗██╔══██║██║╚██╗██║╚════██║██║     ██╔══██╗██║██╔═══╝    ██║   ██║   ██║██╔══██╗"
echo " ╚████╔╝ ██║██████╔╝███████╗╚██████╔╝       ██║   ██║  ██║██║  ██║██║ ╚████║███████║╚██████╗██║  ██║██║██║        ██║   ╚██████╔╝██║  ██║"
echo "  ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝        ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${GREEN}${BOLD}API Key Configuration Tool${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if API key was provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}No API key provided as an argument.${NC}"
  echo -e "Would you like to:"
  echo -e "  1) Enter an API key manually"
  echo -e "  2) Exit"
  read -p "Choose option [1/2]: " choice
  
  if [ "$choice" == "1" ]; then
    echo -e "${YELLOW}Please enter your OpenAI API key:${NC}"
    read -s API_KEY
    echo ""
  else
    echo -e "${YELLOW}Exiting without making changes.${NC}"
    exit 0
  fi
else
  # Get the API key from the first argument
  API_KEY="$1"
fi

# Validate key format (basic check)
if [[ ! "$API_KEY" =~ ^sk-[a-zA-Z0-9]{48,}$ ]]; then
  echo -e "${YELLOW}Warning: The API key format doesn't look like a standard OpenAI API key.${NC}"
  echo -e "Do you want to continue? (y/n)"
  read continue_choice
  
  if [ "$continue_choice" != "y" ] && [ "$continue_choice" != "Y" ]; then
    echo -e "${YELLOW}Exiting without making changes.${NC}"
    exit 0
  fi
fi

echo -e "${GREEN}Updating OpenAI API key for Video Transcriber...${NC}"

# Update .env files in local directories
echo -e "${BLUE}Updating local environment files...${NC}"

# Root .env file
if [ -f .env ]; then
  if grep -q "OPENAI_API_KEY" .env; then
    sed -i '' "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$API_KEY/" .env
  else
    echo "OPENAI_API_KEY=$API_KEY" >> .env
  fi
  
  if grep -q "USE_WHISPER_API" .env; then
    sed -i '' "s/USE_WHISPER_API=.*/USE_WHISPER_API=true/" .env
  else
    echo "USE_WHISPER_API=true" >> .env
  fi
else
  echo "OPENAI_API_KEY=$API_KEY" > .env
  echo "USE_WHISPER_API=true" >> .env
fi

# Video Analyzer .env file
mkdir -p internal-solutions-video-analyzer/src
if [ -f internal-solutions-video-analyzer/.env ]; then
  if grep -q "OPENAI_API_KEY" internal-solutions-video-analyzer/.env; then
    sed -i '' "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$API_KEY/" internal-solutions-video-analyzer/.env
  else
    echo "OPENAI_API_KEY=$API_KEY" >> internal-solutions-video-analyzer/.env
  fi
  
  if grep -q "USE_WHISPER_API" internal-solutions-video-analyzer/.env; then
    sed -i '' "s/USE_WHISPER_API=.*/USE_WHISPER_API=true/" internal-solutions-video-analyzer/.env
  else
    echo "USE_WHISPER_API=true" >> internal-solutions-video-analyzer/.env
  fi
else
  echo "OPENAI_API_KEY=$API_KEY" > internal-solutions-video-analyzer/.env
  echo "USE_WHISPER_API=true" >> internal-solutions-video-analyzer/.env
fi

# Also add .env file in the src directory
echo "OPENAI_API_KEY=$API_KEY" > internal-solutions-video-analyzer/src/.env
echo "USE_WHISPER_API=true" >> internal-solutions-video-analyzer/src/.env

# Update app.py if it exists
APP_PY_PATH="internal-solutions-video-analyzer/src/app.py"
if [ -f "$APP_PY_PATH" ]; then
  echo -e "${BLUE}Updating API key in app.py...${NC}"
  sed -i '' "s|OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '.*')|OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '$API_KEY')|g" "$APP_PY_PATH"
  sed -i '' "s|OPENAI_API_KEY = '.*'|OPENAI_API_KEY = '$API_KEY'|g" "$APP_PY_PATH"
fi

# Create the comprehensive fix script if it doesn't exist
if [ ! -f "fix_video_transcriber.py" ]; then
  echo -e "${BLUE}Creating fix_video_transcriber.py script...${NC}"
  cat > fix_video_transcriber.py << EOF
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
OPENAI_API_KEY = "$API_KEY"
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
EOF

  chmod +x fix_video_transcriber.py
fi

# Create test script if it doesn't exist
if [ ! -f "test_video_transcriber.py" ]; then
  echo -e "${BLUE}Creating test_video_transcriber.py script...${NC}"
  cat > test_video_transcriber.py << EOF
#!/usr/bin/env python3
"""
Test script for Video Transcriber service.
Attempts to:
1. Send a test video URL to the transcription service
2. Poll for results
3. Report success or failure
"""

import requests
import json
import time
import sys

# Configuration
SERVICE_URL = "http://localhost:5002"
TEST_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Short test video
MAX_RETRIES = 15  # Maximum number of status check retries
RETRY_DELAY = 5   # Seconds between retries

def submit_transcription_job():
    """Submit a transcription job with a YouTube URL."""
    print(f"Submitting transcription job for: {TEST_YOUTUBE_URL}")
    
    try:
        response = requests.post(
            f"{SERVICE_URL}/analyze-youtube",
            json={"url": TEST_YOUTUBE_URL}
        )
        response.raise_for_status()
        result = response.json()
        print(f"Job submitted successfully. Job ID: {result.get('job_id')}")
        return result.get('job_id')
    except requests.RequestException as e:
        print(f"Error submitting job: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response text: {e.response.text}")
        return None

def check_transcription_status(job_id):
    """Check the status of a transcription job."""
    try:
        response = requests.get(f"{SERVICE_URL}/jobs/{job_id}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error checking status: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response text: {e.response.text}")
        return {"status": "error", "message": str(e)}

def get_transcription_result(job_id):
    """Get the results of a completed transcription job."""
    try:
        response = requests.get(f"{SERVICE_URL}/transcript/{job_id}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error getting results: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response text: {e.response.text}")
        return {"error": str(e)}

def main():
    """Main test execution flow."""
    print("=== Video Transcriber Service Test ===")
    
    # Step 1: Submit job
    job_id = submit_transcription_job()
    if not job_id:
        print("Failed to submit job. Test failed.")
        return False
    
    # Step 2: Poll for completion
    print("\nPolling for job completion...")
    success = False
    for i in range(MAX_RETRIES):
        print(f"Check {i+1}/{MAX_RETRIES}...")
        status_info = check_transcription_status(job_id)
        
        status = status_info.get('status')
        print(f"Status: {status}")
        
        if status == 'completed':
            success = True
            break
        elif status == 'error' or status == 'failed':
            print(f"Job failed: {status_info.get('message', 'Unknown error')}")
            break
        
        # Look for Whisper API related messages
        message = status_info.get('message', '')
        if "Whisper API" in message:
            print(f"Whisper API related message: {message}")
            if "Failed to use Whisper API" in message:
                print("ERROR: Still failing to use Whisper API")
            elif "Using Whisper API" in message:
                print("SUCCESS: Using Whisper API")
        
        print(f"Waiting {RETRY_DELAY} seconds...")
        time.sleep(RETRY_DELAY)
    
    # Step 3: Get results if successful
    if success:
        print("\nJob completed successfully. Getting results...")
        results = get_transcription_result(job_id)
        
        # Check if transcript exists and is not empty
        transcript = results.get('transcript', '')
        if transcript:
            print("\nSUCCESS: Transcription completed successfully!")
            print(f"\nTranscript preview (first 200 chars):\n{transcript[:200]}...")
            
            # Check if Whisper API was used
            meta = results.get('metadata', {})
            if meta.get('transcription_method') == 'whisper_api':
                print("\nConfirmed: Whisper API was used for transcription.")
            else:
                print(f"\nWarning: Transcription method was {meta.get('transcription_method', 'unknown')}")
            
            return True
        else:
            print("ERROR: Transcript is empty.")
            return False
    else:
        print("\nJob did not complete successfully within the timeout period.")
        return False

if __name__ == "__main__":
    success = main()
    print("\n=== Test Summary ===")
    if success:
        print("✅ Test PASSED: The video transcriber service is working correctly with the OpenAI API key.")
        sys.exit(0)
    else:
        print("❌ Test FAILED: The video transcriber service is not working correctly.")
        sys.exit(1)
EOF

  chmod +x test_video_transcriber.py
fi

# Create Docker Compose override file
echo -e "${BLUE}Creating Docker Compose override file...${NC}"
cat > docker-compose.override.yml << EOF
version: '3'

services:
  video-analyzer:
    environment:
      - OPENAI_API_KEY=$API_KEY
      - USE_WHISPER_API=true
    volumes:
      - ./internal-solutions-video-analyzer/.env:/app/.env
EOF

# Find the video transcriber container
echo -e "${YELLOW}Looking for running video transcriber container...${NC}"
CONTAINER_ID=$(docker ps -qf "name=video-analyzer" || docker ps -qf "name=video-transcriptor")

if [ -z "$CONTAINER_ID" ]; then
  echo -e "${RED}No running video transcriber container found.${NC}"
  echo -e "${YELLOW}Would you like to run the fix script to update local files only? (y/n)${NC}"
  read fix_choice
  
  if [ "$fix_choice" == "y" ] || [ "$fix_choice" == "Y" ]; then
    echo -e "${BLUE}Saving configuration to local files only.${NC}"
  else
    echo -e "${RED}No changes made to container.${NC}"
    echo -e "${YELLOW}When you start the container, it will need the API key.${NC}"
    echo -e "${YELLOW}You can run this script again later when the container is running.${NC}"
  fi
else
  echo -e "${GREEN}Found container with ID: $CONTAINER_ID${NC}"
  echo -e "${YELLOW}Would you like to update the container now? (y/n)${NC}"
  read update_choice
  
  if [ "$update_choice" == "y" ] || [ "$update_choice" == "Y" ]; then
    echo -e "${BLUE}Running fix_video_transcriber.py to update the container...${NC}"
    python3 fix_video_transcriber.py
    
    echo -e "${YELLOW}Would you like to test the transcription service now? (y/n)${NC}"
    read test_choice
    
    if [ "$test_choice" == "y" ] || [ "$test_choice" == "Y" ]; then
      echo -e "${BLUE}Running test_video_transcriber.py...${NC}"
      python3 test_video_transcriber.py
    fi
  else
    echo -e "${YELLOW}Container update skipped.${NC}"
  fi
fi

echo -e "\n${GREEN}${BOLD}OpenAI API Key Configuration Complete${NC}"
echo -e "${BLUE}To manually update the container later, run:${NC}"
echo -e "  python3 fix_video_transcriber.py"
echo -e "${BLUE}To test the transcription service, run:${NC}"
echo -e "  python3 test_video_transcriber.py"
echo -e "${BLUE}You can also access the video transcriber at:${NC}"
echo -e "  http://localhost:5002"

exit 0