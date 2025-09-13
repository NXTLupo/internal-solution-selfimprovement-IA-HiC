#!/usr/bin/env python3
import os
import sys
import logging
import openai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("whisper-debug")

def check_api_key():
    """Check if OpenAI API key is set and valid"""
    print("\n=== OpenAI API Key Check ===")
    
    # Check environment variable
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is not set!")
        return False
    
    # Check key format
    if not api_key.startswith("sk-"):
        print(f"❌ API key doesn't start with 'sk-': {api_key[:7]}...")
        return False
    
    # Mask key for display
    masked_key = f"{api_key[:10]}...{api_key[-5:]}" if len(api_key) > 15 else "INVALID_KEY"
    print(f"✓ OPENAI_API_KEY found: {masked_key}")
    
    # Test key with OpenAI
    print("\n=== Testing OpenAI API key ===")
    try:
        client = openai.OpenAI(api_key=api_key)
        models = client.models.list()
        
        print(f"✓ API key is valid! Found {len(models.data)} models.")
        
        # Check for Whisper model
        whisper_available = any(model.id == "whisper-1" for model in models.data)
        print(f"✓ Whisper-1 model {'is' if whisper_available else 'is NOT'} available")
        
        return True
    except Exception as e:
        print(f"❌ Error testing API key: {str(e)}")
        return False

def check_file_access():
    """Check file access in critical directories"""
    print("\n=== File System Check ===")
    
    # Directories to check
    directories = [
        "uploads",
        "transcripts",
        "temp",
        "static",
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            try:
                os.makedirs(directory, exist_ok=True)
                print(f"✓ Created directory: {directory}")
            except Exception as e:
                print(f"❌ Failed to create directory {directory}: {str(e)}")
                return False
        else:
            print(f"✓ Directory exists: {directory}")
            
            # Check write access
            test_file = os.path.join(directory, ".test_write")
            try:
                with open(test_file, "w") as f:
                    f.write("test")
                os.remove(test_file)
                print(f"  ✓ Write access to {directory}")
            except Exception as e:
                print(f"  ❌ No write access to {directory}: {str(e)}")
                return False
                
    # Check for static/index.html specifically
    if not os.path.exists("static/index.html"):
        print("❌ Missing static/index.html file!")
        
        # Create a minimal version to fix the error
        try:
            os.makedirs("static", exist_ok=True)
            with open("static/index.html", "w") as f:
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
            print("✓ Created minimal static/index.html")
        except Exception as e:
            print(f"❌ Failed to create static/index.html: {str(e)}")
            
    else:
        print("✓ static/index.html exists")
        
    return True

def fix_openai_api():
    """Fix OpenAI API key issues"""
    print("\n=== Fixing OpenAI API Key Issues ===")
    
    # Read current key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not set in environment")
        return False
    
    # Update .env file in video analyzer directory
    video_env_path = os.path.join("internal-solutions-video-analyzer", ".env")
    try:
        with open(video_env_path, "w") as f:
            f.write(f"OPENAI_API_KEY={api_key}\n")
            f.write("USE_WHISPER_API=true\n")
        print(f"✓ Updated {video_env_path}")
    except Exception as e:
        print(f"❌ Failed to update {video_env_path}: {str(e)}")
    
    # Create a special patch for the app.py file if needed
    try:
        from openai import OpenAI
        print("✓ OpenAI package is correctly installed")
    except ImportError:
        print("❌ OpenAI package is not installed! Run: pip install openai")
    
    print("\n=== Restart Instructions ===")
    print("After these fixes, restart the video analyzer container:")
    print("docker restart nxthumans_ai_cx_workbench-video-analyzer-1")
    
    return True

if __name__ == "__main__":
    print("=== Video Analyzer Whisper API Debug Tool ===")
    print("This tool will check for common issues with the OpenAI Whisper API integration.\n")
    
    # Check API key
    key_ok = check_api_key()
    
    # Check file access
    files_ok = check_file_access()
    
    # Apply fixes
    if not key_ok or not files_ok:
        print("\n=== Issues Detected ===")
        fix_openai_api()
    else:
        print("\n=== All Checks Passed ===")
        print("Your OpenAI API key is valid and available in the environment.")
        print("Check your Docker container to ensure the key is passed correctly:")
        print("docker exec nxthumans_ai_cx_workbench-video-analyzer-1 bash -c 'env | grep OPENAI'")