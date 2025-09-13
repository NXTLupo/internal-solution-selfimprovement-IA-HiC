#!/usr/bin/env python3
import os
import sys
import shutil

# ANSI colors for pretty output
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
RED = "\033[0;31m"
BLUE = "\033[0;34m"
NC = "\033[0m"  # No Color

def print_colored(color, message):
    """Print colored message"""
    print(f"{color}{message}{NC}")

def main():
    """Main function to fix OpenAI API key issues"""
    print_colored(BLUE, "=== OpenAI API Key Fix for Video Analyzer ===")
    
    # Get API key from environment
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print_colored(RED, "Error: OPENAI_API_KEY environment variable not set")
        print_colored(YELLOW, "Please set the OPENAI_API_KEY environment variable with a valid API key")
        sys.exit(1)
    
    # Check basic API key format
    if not api_key.startswith("sk-"):
        print_colored(YELLOW, f"Warning: API key doesn't start with 'sk-'. This may not be a valid OpenAI API key.")
    
    # Create .env file with API key
    env_file = ".env"
    try:
        with open(env_file, "w") as f:
            f.write(f"OPENAI_API_KEY={api_key}\n")
            f.write("USE_WHISPER_API=true\n")
        print_colored(GREEN, f"Created {env_file} with API key")
    except Exception as e:
        print_colored(RED, f"Error creating {env_file}: {str(e)}")
    
    # Fix app.py if needed (update import)
    app_py = "app.py"
    app_py_backup = "app.py.backup"
    
    if os.path.exists(app_py):
        # Make backup of original file
        shutil.copy2(app_py, app_py_backup)
        print_colored(GREEN, f"Created backup of {app_py} at {app_py_backup}")
        
        # Read the file
        with open(app_py, "r") as f:
            content = f.read()
        
        # Check for old-style OpenAI import
        old_import = "import openai"
        new_import = "from openai import OpenAI"
        
        # Check for old-style OpenAI client initialization
        old_client = "client = openai.OpenAI(api_key=OPENAI_API_KEY)"
        new_client = "client = OpenAI(api_key=OPENAI_API_KEY)"
        
        # Replace imports if needed
        if old_import in content and new_import not in content:
            content = content.replace(old_import, new_import)
            print_colored(GREEN, "Updated OpenAI import statement")
        
        # Replace client initialization if needed
        if old_client in content:
            content = content.replace(old_client, new_client)
            print_colored(GREEN, "Updated OpenAI client initialization")
        
        # Write the modified file
        with open(app_py, "w") as f:
            f.write(content)
        
        print_colored(GREEN, f"Updated {app_py} with OpenAI client fixes")
    else:
        print_colored(YELLOW, f"Warning: {app_py} not found in current directory")
    
    # Create static directory if needed
    static_dir = "static"
    if not os.path.exists(static_dir):
        os.makedirs(static_dir, exist_ok=True)
        print_colored(GREEN, f"Created {static_dir} directory")
    
    # Create index.html if needed
    index_html = os.path.join(static_dir, "index.html")
    if not os.path.exists(index_html):
        with open(index_html, "w") as f:
            f.write("""<!DOCTYPE html>
<html>
<head>
    <title>Video Analyzer</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Video Analyzer</h1>
    <p>Upload a video or paste a YouTube URL to analyze.</p>
</body>
</html>""")
        print_colored(GREEN, f"Created {index_html}")
    
    print_colored(BLUE, "\n=== Fix Complete ===")
    print_colored(YELLOW, "Please restart the video analyzer service to apply changes")
    print_colored(YELLOW, "docker restart nxthumans_ai_cx_workbench-video-analyzer-1")

if __name__ == "__main__":
    main()