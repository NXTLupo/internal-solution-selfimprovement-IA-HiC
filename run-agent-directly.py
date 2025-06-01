#!/usr/bin/env python3
"""
Run the agent service directly without Docker to eliminate container networking issues
"""
import os
import sys
import subprocess
import signal
import time
import platform
import shutil

# Colors for terminal output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
BOLD = '\033[1m'
RESET = '\033[0m'

def print_color(color, message):
    """Print colored text"""
    print(f"{color}{message}{RESET}")

def check_python_version():
    """Check if Python version is 3.9+"""
    if sys.version_info < (3, 9):
        print_color(RED, "Error: Python 3.9 or higher is required")
        sys.exit(1)
    print_color(GREEN, f"Using Python {sys.version.split()[0]}")

def check_pip():
    """Check if pip is installed"""
    try:
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                       stdout=subprocess.DEVNULL, 
                       stderr=subprocess.DEVNULL, 
                       check=True)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False

def create_venv(venv_path):
    """Create a virtual environment"""
    print_color(BLUE, f"Creating virtual environment at {venv_path}...")
    try:
        subprocess.run([sys.executable, "-m", "venv", venv_path], check=True)
        print_color(GREEN, "Virtual environment created successfully")
        return True
    except subprocess.SubprocessError as e:
        print_color(RED, f"Failed to create virtual environment: {e}")
        return False

def get_activate_script(venv_path):
    """Get the activate script path based on the OS"""
    if platform.system() == "Windows":
        return os.path.join(venv_path, "Scripts", "activate.bat")
    else:
        return os.path.join(venv_path, "bin", "activate")

def run_command_in_venv(venv_path, command, cwd=None, env=None):
    """Run a command in the virtual environment"""
    activate_script = get_activate_script(venv_path)
    
    if platform.system() == "Windows":
        cmd = f'"{activate_script}" && {command}'
        shell = True
    else:
        cmd = f"source '{activate_script}' && {command}"
        shell = True
    
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    
    try:
        process = subprocess.Popen(
            cmd, 
            shell=shell, 
            cwd=cwd,
            env=merged_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Stream the output
        for line in process.stdout:
            print(line.rstrip())
        
        process.wait()
        return process.returncode == 0
    except subprocess.SubprocessError as e:
        print_color(RED, f"Command failed: {e}")
        return False

def setup_agent(agent_dir, venv_path):
    """Set up the agent service"""
    print_color(BLUE, "Setting up the agent service...")
    
    # Install required packages
    print_color(BLUE, "Installing requirements...")
    requirements_path = os.path.join(agent_dir, "requirements.txt")
    
    if not os.path.exists(requirements_path):
        print_color(YELLOW, "Warning: requirements.txt not found, creating a basic one...")
        with open(requirements_path, "w") as f:
            f.write("fastapi\nuvicorn\nwebsockets\nanthropicapi\nasyncio\npydantic\n")
    
    success = run_command_in_venv(
        venv_path, 
        f"pip install -r '{requirements_path}'", 
        cwd=agent_dir
    )
    
    if not success:
        print_color(RED, "Failed to install dependencies")
        return False
    
    print_color(GREEN, "Dependencies installed successfully")
    return True

def setup_launchpad(launchpad_dir, venv_path):
    """Set up the launchpad service"""
    print_color(BLUE, "Setting up the launchpad service...")
    
    # Install required packages
    print_color(BLUE, "Installing requirements...")
    requirements_path = os.path.join(launchpad_dir, "requirements.txt")
    
    if not os.path.exists(requirements_path):
        print_color(YELLOW, "Warning: requirements.txt not found, creating a basic one...")
        with open(requirements_path, "w") as f:
            f.write("flask\nflask-sock\nwebsockets\nrequests\n")
    
    success = run_command_in_venv(
        venv_path, 
        f"pip install -r '{requirements_path}'", 
        cwd=launchpad_dir
    )
    
    if not success:
        print_color(RED, "Failed to install dependencies")
        return False
    
    print_color(GREEN, "Dependencies installed successfully")
    return True

def create_standalone_agent(source_dir, target_dir):
    """Create a standalone agent service"""
    print_color(BLUE, f"Creating standalone agent in {target_dir}...")
    
    # Create directory if it doesn't exist
    os.makedirs(target_dir, exist_ok=True)
    
    # Copy app.py and requirements.txt
    try:
        shutil.copy(os.path.join(source_dir, "app.py"), os.path.join(target_dir, "app.py"))
        print_color(GREEN, "Copied app.py")
        
        req_path = os.path.join(source_dir, "requirements.txt")
        if os.path.exists(req_path):
            shutil.copy(req_path, os.path.join(target_dir, "requirements.txt"))
            print_color(GREEN, "Copied requirements.txt")
        else:
            print_color(YELLOW, "Requirements file not found, will create one.")
    except (IOError, shutil.Error) as e:
        print_color(RED, f"Error copying files: {e}")
        return False
    
    # Create logs directory
    logs_dir = os.path.join(target_dir, "logs")
    os.makedirs(logs_dir, exist_ok=True)
    
    # Create a test websocket client
    with open(os.path.join(target_dir, "test_websocket.py"), "w") as f:
        f.write("""
import asyncio
import websockets
import json
import uuid
import sys

async def connect_and_test():
    conversation_id = str(uuid.uuid4())
    uri = f"ws://localhost:8500/ws/{conversation_id}"
    try:
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("WebSocket connection established")
            
            # Send a test message
            message = {
                "type": "message",
                "content": "This is a test message from the standalone test client"
            }
            await websocket.send(json.dumps(message))
            print(f"Sent message: {message}")
            
            # Wait for a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=30)
                print(f"Received response: {response}")
                return True
            except asyncio.TimeoutError:
                print("No response received within timeout period")
                return False
    except Exception as e:
        print(f"Connection error: {e}")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(connect_and_test())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("Test cancelled")
        sys.exit(1)
""")
    
    print_color(GREEN, "Created test WebSocket client")
    
    # Create a startup script
    with open(os.path.join(target_dir, "start.sh"), "w") as f:
        f.write("""#!/bin/bash
export ANTHROPIC_API_KEY=***REDACTED-ANTHROPIC-KEY***
export ANTHROPIC_MODEL=claude-3-7-sonnet-20250219
export PORT=8500

# Make sure uvicorn is installed
pip install -r requirements.txt

# Start the agent with debug logging
uvicorn app:app --host 0.0.0.0 --port 8500 --log-level debug
""")
    
    # Make the script executable
    os.chmod(os.path.join(target_dir, "start.sh"), 0o755)
    
    print_color(GREEN, "Created startup script")
    print_color(GREEN, "Standalone agent setup complete")
    return True

def run_agent(agent_dir, venv_path):
    """Run the agent service"""
    print_color(BLUE, "Starting the agent service...")
    
    env = {
        "ANTHROPIC_API_KEY": "***REDACTED-ANTHROPIC-KEY***",
        "ANTHROPIC_MODEL": "claude-3-7-sonnet-20250219",
        "PORT": "8500",
        "PYTHONUNBUFFERED": "1"  # Ensure output is not buffered
    }
    
    print_color(GREEN, "Agent configuration:")
    print_color(YELLOW, f"  API Key: {env['ANTHROPIC_API_KEY'][:10]}...{env['ANTHROPIC_API_KEY'][-6:]}")
    print_color(YELLOW, f"  Model: {env['ANTHROPIC_MODEL']}")
    print_color(YELLOW, f"  Port: {env['PORT']}")
    
    start_script = os.path.join(agent_dir, "start.sh")
    if os.path.exists(start_script):
        print_color(BLUE, "Using start.sh to run the agent...")
        os.chmod(start_script, 0o755)
        return run_command_in_venv(venv_path, f"bash {start_script}", cwd=agent_dir, env=env)
    else:
        print_color(BLUE, "Using uvicorn to run the agent directly...")
        return run_command_in_venv(
            venv_path, 
            "uvicorn app:app --host 0.0.0.0 --port 8500 --log-level debug", 
            cwd=agent_dir,
            env=env
        )

def main():
    """Main function"""
    print_color(BOLD + GREEN, """
    ┌─────────────────────────────────────────────┐
    │ NXT Humans AI CX Workbench - Direct Agent   │
    └─────────────────────────────────────────────┘
    """)
    
    # Check Python version
    check_python_version()
    
    # Check if pip is installed
    if not check_pip():
        print_color(RED, "Error: pip is not installed")
        sys.exit(1)
    
    # Base directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Set up paths
    agent_source_dir = os.path.join(base_dir, "mcp-services", "agent")
    standalone_dir = os.path.join(base_dir, "standalone-agent")
    venv_path = os.path.join(standalone_dir, "venv")
    
    # Create the standalone agent directory structure
    if not os.path.exists(agent_source_dir):
        print_color(RED, f"Error: Agent source directory not found at {agent_source_dir}")
        agent_source_dir = os.path.join(base_dir, "mcp-services")
        
        if not os.path.exists(agent_source_dir):
            print_color(RED, "Error: mcp-services directory not found either.")
            agent_source_dir = base_dir
            print_color(YELLOW, f"Will attempt to create a basic agent in {standalone_dir}")
            
    # Create the standalone agent directory
    create_standalone_agent(agent_source_dir, standalone_dir)
    
    # Create virtual environment
    if not os.path.exists(venv_path):
        if not create_venv(venv_path):
            print_color(RED, "Failed to create virtual environment")
            sys.exit(1)
    else:
        print_color(GREEN, "Using existing virtual environment")
    
    # Set up the agent
    if not setup_agent(standalone_dir, venv_path):
        print_color(RED, "Failed to set up the agent")
        sys.exit(1)
    
    # Run the agent
    print_color(BOLD + GREEN, "Starting agent service...")
    try:
        run_agent(standalone_dir, venv_path)
    except KeyboardInterrupt:
        print_color(YELLOW, "\nAgent service stopped")
    
    print_color(GREEN, "Done")

if __name__ == "__main__":
    main()