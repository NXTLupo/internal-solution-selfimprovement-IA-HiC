#!/usr/bin/env python3
"""
FLUX LoRA Studio - Local Kohya_ss Training Launcher
Run this script to start the local LoRA training service
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Start FLUX LoRA Studio local service"""
    
    # Set working directory to script location
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("🎨 FLUX LoRA Studio - Local Kohya_ss Training")
    print("📱 Apple Silicon M3 MacBook Pro Optimized")
    print("=" * 50)
    print()
    
    # Check Python 3.10 requirement for Apple Silicon
    print("🔍 Checking Python 3.10 requirement...")
    try:
        result = subprocess.run(["python3.10", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Python 3.10 found: {result.stdout.strip()}")
        else:
            raise FileNotFoundError
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("❌ Python 3.10 not found!")
        print("   Install with: brew install python@3.10")
        print("   This is REQUIRED for Apple Silicon compatibility")
        return 1
    
    # Check if virtual environment exists
    venv_path = script_dir / "venv"
    if not venv_path.exists():
        print("📦 Setting up virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        print("✅ Virtual environment created")
    
    # Determine activate script
    if os.name == 'nt':  # Windows
        activate_script = venv_path / "Scripts" / "activate.bat"
        python_exe = venv_path / "Scripts" / "python.exe"
    else:  # Unix/MacOS
        activate_script = venv_path / "bin" / "activate"
        python_exe = venv_path / "bin" / "python"
    
    print("📚 Installing dependencies...")
    subprocess.run([str(python_exe), "-m", "pip", "install", "-r", "requirements.txt"], check=True)
    print("✅ Dependencies installed")
    
    # Check A11y Image Captioner availability
    print("\n🔍 Checking A11y Image Captioner service...")
    try:
        import requests
        response = requests.get("http://localhost:5005/health", timeout=5)
        if response.status_code == 200:
            print("✅ A11y Image Captioner service running on port 5005")
        else:
            print("⚠️  A11y Image Captioner service not responding properly")
    except Exception:
        print("❌ A11y Image Captioner service not available on port 5005")
        print("   Please start the image captioner service first:")
        print("   cd internal-solutions-image-captioner && python app.py")
    
    print(f"\n🚀 Starting FLUX LoRA Studio on http://localhost:5006")
    print("   Real local LoRA training with Kohya_ss")
    print("   Press Ctrl+C to stop")
    print()
    
    # Set environment variable for development mode
    env = os.environ.copy()
    env['DEVELOPMENT_MODE'] = 'local'
    env['IMAGE_CAPTIONER_URL'] = 'http://localhost:5005'
    
    try:
        # Start the application
        subprocess.run([
            str(python_exe), "-m", "uvicorn", 
            "app:app", 
            "--host", "0.0.0.0", 
            "--port", "5006", 
            "--reload"
        ], env=env, check=True)
    except KeyboardInterrupt:
        print("\n👋 FLUX LoRA Studio stopped")
    except Exception as e:
        print(f"\n❌ Error starting service: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())