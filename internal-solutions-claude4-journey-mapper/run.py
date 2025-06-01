#!/usr/bin/env python3
import uvicorn
import os
import sys
import subprocess
import time
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def is_port_in_use(port):
    """Check if a port is in use"""
    try:
        # For macOS and Linux
        if sys.platform == 'darwin' or sys.platform.startswith('linux'):
            cmd = f"lsof -i:{port} -t"
            output = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode().strip()
            return bool(output)
        # For Windows
        elif sys.platform == 'win32':
            cmd = f"netstat -ano | findstr :{port}"
            output = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode().strip()
            return bool(output)
    except:
        return False

def kill_process_on_port(port):
    """Kill any process running on the specified port"""
    try:
        if sys.platform == 'darwin' or sys.platform.startswith('linux'):
            cmd = f"lsof -i:{port} -t"
            pids = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode().strip().split('\n')
            for pid in pids:
                if pid:
                    print(f"Killing process {pid} on port {port}")
                    try:
                        os.kill(int(pid), 9)
                    except:
                        pass
        elif sys.platform == 'win32':
            cmd = f"netstat -ano | findstr :{port}"
            output = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode()
            for line in output.strip().split('\n'):
                if line:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        pid = parts[4]
                        print(f"Killing process {pid} on port {port}")
                        try:
                            os.kill(int(pid), 9)
                        except:
                            pass
    except:
        pass

if __name__ == "__main__":
    # Define a list of ports to try
    ports_to_try = [8090, 8888, 9090, 9000]
    
    # Get port from environment if set
    env_port = os.environ.get("PORT")
    if env_port:
        try:
            # Convert to int and insert at beginning of list
            port_num = int(env_port)
            if port_num not in ports_to_try:
                ports_to_try.insert(0, port_num)
        except ValueError:
            print(f"Invalid PORT environment variable: {env_port}")
    
    # Try each port until one works
    selected_port = None
    for port in ports_to_try:
        print(f"Checking port {port}...")
        
        # Check if port is in use
        if is_port_in_use(port):
            print(f"Port {port} is in use, attempting to free it...")
            kill_process_on_port(port)
            time.sleep(1)
            
            # Check again after attempting to kill
            if is_port_in_use(port):
                print(f"Could not free port {port}, trying next port")
                continue
        
        # If we get here, port should be available
        selected_port = port
        print(f"Using port {selected_port}")
        break
    
    # If no ports are available, exit
    if selected_port is None:
        print("Error: Could not find an available port. Please free one of these ports manually:")
        for port in ports_to_try:
            print(f"  - {port}")
        sys.exit(1)
    
    # Check if API key is set
    if "ANTHROPIC_API_KEY" not in os.environ:
        api_key = input("Enter your Anthropic API key (or press Enter to use default): ")
        if api_key:
            os.environ["ANTHROPIC_API_KEY"] = api_key
        else:
            default_key = "***REDACTED-ANTHROPIC-KEY***"
            print("Using default API key")
            os.environ["ANTHROPIC_API_KEY"] = default_key
    
    # Set the model to Claude 4
    if "ANTHROPIC_MODEL" not in os.environ:
        os.environ["ANTHROPIC_MODEL"] = "claude-sonnet-4-20250514"
    
    # Create necessary directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("journey_maps", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    os.makedirs("static", exist_ok=True)
    
    # Start the server
    print(f"Starting AI Journey Mapper with Claude 4 on port {selected_port}...")
    host = "0.0.0.0"
    
    # Try both import paths
    try:
        # First try with src.app
        uvicorn.run("src.app:app", host=host, port=selected_port, reload=True)
    except ImportError:
        # If that fails, try direct import
        print("Falling back to direct app import...")
        uvicorn.run("app:app", host=host, port=selected_port, reload=True)