import os
import sys
import subprocess
import argparse

def find_container_name():
    """Find the Social Research backend container name"""
    try:
        result = subprocess.run(
            "docker ps --format \"{{.Names}}\" | findstr social-research-backend",
            shell=True, capture_output=True, text=True
        )
        
        container_names = result.stdout.strip().split('\n')
        if container_names and container_names[0]:
            return container_names[0]
        
        # Fallback to the default container name
        return 'nxt-humans_ai_cx_workbench-social-research-backend-1'
    except Exception as e:
        print(f"Error finding container name: {e}")
        return 'nxt-humans_ai_cx_workbench-social-research-backend-1'

def fix_api_keys(container_name):
    """Fix the API key loading in the backend container"""
    print(f"Fixing API key loading for container: {container_name}")
    
    # Create a Python script to fix the API key loading issue
    fix_script = """
import os
from pathlib import Path
import sys

# Print current directory for debugging
print(f"Current directory: {os.getcwd()}")

# Check .env file in project root
root_dir = Path(__file__).parent.parent.parent.parent.parent
root_env_path = root_dir / '.env'

if root_env_path.exists():
    print(f"Root .env file found at: {root_env_path}")
    # Read the .env file to extract keys
    with open(root_env_path, 'r') as file:
        env_lines = file.readlines()
    
    # Extract API keys
    keys = {}
    for line in env_lines:
        if '=' in line:
            key, value = line.strip().split('=', 1)
            if key in ('GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY'):
                keys[key] = value
    
    # Print found keys (without revealing full keys)
    for key, value in keys.items():
        print(f"Found {key}: {value[:8]}...{value[-4:]}")
    
    # Fix the LLM provider files
    try:
        # Update gemini.py
        gemini_path = Path('util/llm_models/gemini.py')
        if gemini_path.exists():
            print(f"Updating {gemini_path}")
            with open(gemini_path, 'r') as file:
                gemini_content = file.read()
            
            # Replace the key loading logic if needed
            if 'OPENAI_API_KEY' in gemini_content:
                print("Fixing incorrect API key in gemini.py")
                gemini_content = gemini_content.replace('OPENAI_API_KEY', 'GEMINI_API_KEY')
            
            with open(gemini_path, 'w') as file:
                file.write(gemini_content)
        
        # Explicitly set environment variables for all LLM providers
        if 'GEMINI_API_KEY' in keys:
            os.environ['GEMINI_API_KEY'] = keys['GEMINI_API_KEY']
        if 'ANTHROPIC_API_KEY' in keys:
            os.environ['ANTHROPIC_API_KEY'] = keys['ANTHROPIC_API_KEY']
            os.environ['CLAUDE_API_KEY'] = keys['ANTHROPIC_API_KEY']
            os.environ['CLAUDE4_API_KEY'] = keys['ANTHROPIC_API_KEY']
        if 'OPENAI_API_KEY' in keys:
            os.environ['OPENAI_API_KEY'] = keys['OPENAI_API_KEY']
            os.environ['CHATGPT5_API_KEY'] = keys['OPENAI_API_KEY']
        
        print("Environment variables set successfully")
        
    except Exception as e:
        print(f"Error updating LLM provider files: {e}")
else:
    print(f"Root .env file not found at: {root_env_path}")

# Create a test file to verify the API key loading is working
try:
    test_file = Path('/tmp/api_keys.py')
    with open(test_file, 'w') as file:
        file.write('''
import os
import json
import google.generativeai as genai
import anthropic
import openai

# Test Gemini API key
gemini_key = os.getenv("GEMINI_API_KEY")
print(f"GEMINI_API_KEY: {gemini_key[:8]}...{gemini_key[-4:] if gemini_key and len(gemini_key) > 12 else 'NOT FOUND'}")

# Test Anthropic API key
anthropic_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY") or os.getenv("CLAUDE4_API_KEY")
print(f"ANTHROPIC_API_KEY: {anthropic_key[:8]}...{anthropic_key[-4:] if anthropic_key and len(anthropic_key) > 12 else 'NOT FOUND'}")

# Test OpenAI API key
openai_key = os.getenv("OPENAI_API_KEY") or os.getenv("CHATGPT5_API_KEY")
print(f"OPENAI_API_KEY: {openai_key[:8]}...{openai_key[-4:] if openai_key and len(openai_key) > 12 else 'NOT FOUND'}")
''')
    print(f"Created test file at {test_file}")
    
except Exception as e:
    print(f"Error creating test file: {e}")

print("API key fix completed")
"""
    
    # Copy the fix script to the container
    print("Creating fix script...")
    script_path = "/tmp/fix_api_keys.py"
    command = f"""docker exec {container_name} bash -c "cat > {script_path} << 'EOL'
{fix_script}
EOL"
"""
    subprocess.run(command, shell=True, check=True)
    
    # Run the fix script in the container
    print("Running fix script...")
    subprocess.run(f"docker exec {container_name} python {script_path}", shell=True, check=True)
    
    # Test the API keys after the fix
    print("\nVerifying API keys...")
    subprocess.run(f"docker exec {container_name} python /tmp/api_keys.py", shell=True, check=True)
    
    return True

def fix_llm_provider_selection():
    """Fix the LLM provider selection code to use the correct API keys"""
    container_name = find_container_name()
    
    # Create a Python script to modify llm_provider.py
    llm_provider_script = """
import os
from pathlib import Path

# Find the llm_provider.py file
llm_provider_path = Path('util/llm_models/llm_provider.py')

if llm_provider_path.exists():
    print(f"Found llm_provider.py at: {llm_provider_path}")
    with open(llm_provider_path, 'r') as file:
        content = file.read()
    
    # Check for AI ask feature
    if 'get_llm_completion' in content:
        print("Found get_llm_completion function, updating provider selection...")
        
        # Make changes to ensure the right keys are used for each provider
        lines = content.split('\\n')
        updated_lines = []
        
        # Find the section where providers are selected
        in_provider_selection = False
        for line in lines:
            # Update the provider selection to ensure the correct API keys are used
            if line.strip().startswith('# Select the appropriate provider based on availability'):
                in_provider_selection = True
            elif in_provider_selection and 'provider == "gemini"' in line:
                # Fix Gemini provider check to use GEMINI_API_KEY
                updated_lines.append('    elif provider == "gemini" and gemini_key and HAS_GEMINI:')
            elif in_provider_selection and 'provider == "claude"' in line:
                # Fix Claude provider check to use ANTHROPIC_API_KEY
                updated_lines.append('    if provider == "claude" and claude_key:')
            elif in_provider_selection and 'provider == "openai"' in line:
                # Fix OpenAI provider check to use OPENAI_API_KEY
                updated_lines.append('    elif provider == "openai" and openai_key:')
            else:
                updated_lines.append(line)
        
        # Join the updated lines back into content
        updated_content = '\\n'.join(updated_lines)
        
        # Write the updated content back to the file
        with open(llm_provider_path, 'w') as file:
            file.write(updated_content)
        
        print("Updated llm_provider.py successfully")
    else:
        print("get_llm_completion function not found in llm_provider.py, skipping update")
else:
    print(f"llm_provider.py not found at: {llm_provider_path}")
"""
    
    # Copy the script to the container
    print("Creating LLM provider fix script...")
    script_path = "/tmp/fix_llm_provider.py"
    command = f"""docker exec {container_name} bash -c "cat > {script_path} << 'EOL'
{llm_provider_script}
EOL"
"""
    subprocess.run(command, shell=True, check=True)
    
    # Run the script in the container
    print("Running LLM provider fix script...")
    subprocess.run(f"docker exec {container_name} python {script_path}", shell=True, check=True)
    
    return True

def restart_services():
    """Restart the social research services"""
    try:
        print("Restarting social research services...")
        subprocess.run("docker compose -f docker-compose-all.yml restart social-research-backend", shell=True, check=True)
        subprocess.run("docker compose -f docker-compose-all.yml restart social-research-frontend", shell=True, check=True)
        print("Services restarted successfully")
        return True
    except Exception as e:
        print(f"Error restarting services: {e}")
        return False

def main():
    """Main function to fix the Ask AI feature"""
    parser = argparse.ArgumentParser(description="Fix Ask AI feature to use the correct API keys")
    parser.add_argument("--no-restart", action="store_true", help="Skip restarting services")
    args = parser.parse_args()
    
    print("======= Social Research Ask AI Fix =======")
    print("This script fixes the API key issue in the Ask AI feature")
    print("==========================================")
    
    # Find the social research backend container
    container_name = find_container_name()
    print(f"Using container: {container_name}")
    
    # Fix the API keys
    if fix_api_keys(container_name):
        print("\n✓ API keys fixed successfully")
    else:
        print("\n✗ Failed to fix API keys")
        return 1
    
    # Fix the LLM provider selection
    if fix_llm_provider_selection():
        print("\n✓ LLM provider selection fixed successfully")
    else:
        print("\n✗ Failed to fix LLM provider selection")
        return 1
    
    # Restart services if not skipped
    if not args.no_restart:
        if restart_services():
            print("\n✓ Services restarted successfully")
        else:
            print("\n✗ Failed to restart services")
            return 1
    
    print("\n==========================================")
    print("Fix completed! The Ask AI feature should now use the correct API keys:")
    print("- GEMINI_API_KEY for Gemini 2.5 Pro model")
    print("- ANTHROPIC_API_KEY for Claude 4 model")
    print("- OPENAI_API_KEY for GPT-5 model")
    print("==========================================")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())