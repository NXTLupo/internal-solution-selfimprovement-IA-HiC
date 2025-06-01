#!/usr/bin/env python3
import uvicorn
import os
import sys
import subprocess
import time

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

# Add the project root to PYTHONPATH to ensure modules can be imported
import sys
import os
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.append(project_root)
    print(f"Added {project_root} to Python path")

if __name__ == "__main__":
    # Define a list of ports to try
    ports_to_try = [8090, 5005, 3005, 9005]  # Different ports from Anthropic version
    
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
    
    # Verify o3 model access before starting
    try:
        # We need to try this early to verify o3 access
        from openai_api_wrapper import check_organization_verification
        o3_verified = check_organization_verification()
        if o3_verified:
            print("✅ Organization verified for o3 access")
        else:
            print("⚠️ Organization not verified for o3 access - will use fallback model")
            # If o3 is not available but was requested, fall back to GPT-4o
            if os.environ.get("OPENAI_MODEL") == "o3":
                print("Falling back to gpt-4o model")
                os.environ["OPENAI_MODEL"] = "gpt-4o"
    except Exception as e:
        print(f"Error checking o3 access: {str(e)}")
        # Default to a widely available model
        os.environ["OPENAI_MODEL"] = "gpt-4o"
    
    # If no ports are available, exit
    if selected_port is None:
        print("Error: Could not find an available port. Please free one of these ports manually:")
        for port in ports_to_try:
            print(f"  - {port}")
        sys.exit(1)
    
    # Check if API key is set
    if "OPENAI_API_KEY" not in os.environ:
        api_key = input("Enter your OpenAI API key (or press Enter to use default from .env file): ")
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
        else:
            # Look for key in .env file first
            try:
                from dotenv import load_dotenv
                load_dotenv()
                openai_key = os.environ.get("OPENAI_API_KEY")
                if openai_key:
                    print("Using OpenAI API key from .env file")
                else:
                    print("No OpenAI API key found in .env file")
            except ImportError:
                print("python-dotenv not installed, cannot load from .env file")
    else:
        print("Using OpenAI API key from environment variables")
    
    # Set the model - prioritize o3 reasoning model if available
    if "OPENAI_MODEL" not in os.environ:
        os.environ["OPENAI_MODEL"] = "o3"  # Using o3 reasoning model
    
    # Set reasoning effort level if not specified
    if "REASONING_EFFORT" not in os.environ:
        os.environ["REASONING_EFFORT"] = "medium"  # Options: low, medium, high
    
    # Create necessary directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("journey_maps", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    os.makedirs("static", exist_ok=True)
    
    # Set the PORT environment variable for the app to use
    os.environ["PORT"] = str(selected_port)
    
    # Start the server
    print(f"Starting OpenAI Journey Mapper on port {selected_port}...")
    host = "0.0.0.0"
    
    # Use the app.py entry point we created
    try:
        import subprocess
        print("Running app.py directly to avoid import issues...")
        subprocess.run([sys.executable, "app.py"])
    except Exception as e:
        print(f"Error running app.py: {e}")
        print("Falling back to uvicorn...")
        # Try both import paths
        try:
            # First try with app:app
            uvicorn.run("app:app", host=host, port=selected_port, reload=True)
        except ImportError:
            # If that fails, try with src.app
            print("Falling back to src.app import...")
            uvicorn.run("src.app:app", host=host, port=selected_port, reload=True)