#!/usr/bin/env python3
import os
import sys
import subprocess
import webbrowser
import time
import platform
import threading

# Configuration
WORKBENCH_URL = "http://localhost:8000"
COMPOSE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docker-compose.yml")

def is_docker_running():
    """Check if Docker is running"""
    try:
        subprocess.run(
            ["docker", "info"], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            check=True, 
            timeout=5
        )
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False

def start_docker_compose():
    """Start services using docker-compose"""
    print("Starting NXT Humans AI CX Workbench...")
    
    # Check if Docker is installed and running
    if not is_docker_running():
        print("ERROR: Docker is not running or not installed.")
        print("Please start Docker and try again.")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Run docker-compose up
    try:
        # Use -d flag to run in detached mode
        process = subprocess.Popen(
            ["docker", "compose", "-f", COMPOSE_FILE, "up", "-d"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Show progress while starting
        print("Starting services (this may take a minute)...")
        for i in range(10):
            time.sleep(0.5)
            print(".", end="", flush=True)
            
        print("\nServices are starting...\n")
        
        # Wait a bit for services to fully start
        time.sleep(5)
        
        return True
    except subprocess.SubprocessError as e:
        print(f"ERROR: Failed to start Docker Compose: {str(e)}")
        input("Press Enter to exit...")
        return False

def open_browser():
    """Open the workbench URL in the default browser"""
    print(f"Opening {WORKBENCH_URL} in your browser...")
    webbrowser.open(WORKBENCH_URL)

def create_desktop_shortcut():
    """Create a desktop shortcut/launcher based on the operating system"""
    try:
        home_dir = os.path.expanduser("~")
        desktop_dir = os.path.join(home_dir, "Desktop")
        script_path = os.path.abspath(__file__)
        workbench_dir = os.path.dirname(script_path)
        logo_path = os.path.join(workbench_dir, "launchpad", "static", "nxt-humans-logo.png")
        
        if platform.system() == "Windows":
            # Create a .bat file on Windows
            shortcut_path = os.path.join(desktop_dir, "NXT Humans Workbench.bat")
            with open(shortcut_path, "w") as f:
                f.write(f'@echo off\n')
                f.write(f'echo Starting NXT Humans AI CX Workbench...\n')
                f.write(f'python "{script_path}"\n')
            
            print(f"Desktop shortcut created at: {shortcut_path}")
            
        elif platform.system() == "Darwin":  # macOS
            # Create an AppleScript application on macOS
            app_dir = os.path.join(desktop_dir, "NXT Humans Workbench.app")
            os.makedirs(os.path.join(app_dir, "Contents", "MacOS"), exist_ok=True)
            os.makedirs(os.path.join(app_dir, "Contents", "Resources"), exist_ok=True)
            
            # Copy icon if it exists
            if os.path.exists(logo_path):
                subprocess.run(["cp", logo_path, os.path.join(app_dir, "Contents", "Resources", "icon.png")])
            
            # Create the Info.plist file
            with open(os.path.join(app_dir, "Contents", "Info.plist"), "w") as f:
                f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
                f.write('<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n')
                f.write('<plist version="1.0">\n')
                f.write('<dict>\n')
                f.write('    <key>CFBundleExecutable</key>\n')
                f.write('    <string>run.sh</string>\n')
                f.write('    <key>CFBundleIconFile</key>\n')
                f.write('    <string>icon.png</string>\n')
                f.write('    <key>CFBundleIdentifier</key>\n')
                f.write('    <string>com.nxthumans.workbench</string>\n')
                f.write('    <key>CFBundleName</key>\n')
                f.write('    <string>NXT Humans Workbench</string>\n')
                f.write('    <key>CFBundlePackageType</key>\n')
                f.write('    <string>APPL</string>\n')
                f.write('</dict>\n')
                f.write('</plist>\n')
            
            # Create the executable script
            with open(os.path.join(app_dir, "Contents", "MacOS", "run.sh"), "w") as f:
                f.write('#!/bin/bash\n')
                f.write(f'cd "{workbench_dir}"\n')
                f.write(f'python3 "{script_path}"\n')
            
            # Make the script executable
            subprocess.run(["chmod", "+x", os.path.join(app_dir, "Contents", "MacOS", "run.sh")])
            
            print(f"Desktop application created at: {app_dir}")
            
        elif platform.system() == "Linux":
            # Create a .desktop file on Linux
            shortcut_path = os.path.join(desktop_dir, "nxthumans-workbench.desktop")
            with open(shortcut_path, "w") as f:
                f.write("[Desktop Entry]\n")
                f.write("Type=Application\n")
                f.write("Name=NXT Humans Workbench\n")
                f.write(f"Exec=python3 {script_path}\n")
                f.write("Icon=" + logo_path + "\n")
                f.write("Terminal=false\n")
                f.write("Categories=Development;Utility;\n")
            
            # Make the .desktop file executable
            subprocess.run(["chmod", "+x", shortcut_path])
            
            print(f"Desktop shortcut created at: {shortcut_path}")
            
        else:
            print("Desktop shortcut creation not supported on this platform.")
    
    except Exception as e:
        print(f"Error creating desktop shortcut: {str(e)}")
        print("You can still launch the application by running this script directly.")

def stop_services_on_exit():
    """Stop Docker Compose services when the script exits"""
    print("\nStopping services...")
    try:
        subprocess.run(
            ["docker", "compose", "-f", COMPOSE_FILE, "down"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        print("Services stopped.")
    except subprocess.SubprocessError as e:
        print(f"Error stopping services: {str(e)}")

def monitor_user_input():
    """Monitor for user keyboard input to exit"""
    print("\nWorkbench is now running!")
    print("Press Ctrl+C or 'q' to exit and stop all services")
    
    while True:
        try:
            user_input = input()
            if user_input.lower() == 'q':
                print("Exiting...")
                stop_services_on_exit()
                sys.exit(0)
        except KeyboardInterrupt:
            print("\nExiting...")
            stop_services_on_exit()
            sys.exit(0)

if __name__ == "__main__":
    # Check if running for the first time (no desktop shortcut)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    first_run_flag = os.path.join(script_dir, ".first_run")
    
    if not os.path.exists(first_run_flag):
        # Ask about creating a desktop shortcut
        print("Would you like to create a desktop shortcut for easy launching? (y/n)")
        response = input().strip().lower()
        if response.startswith('y'):
            create_desktop_shortcut()
        
        # Create the first run flag file to avoid asking again
        with open(first_run_flag, "w") as f:
            f.write("Shortcut created on " + time.ctime())
    
    # Start the services
    if start_docker_compose():
        # Wait a bit for services to initialize
        time.sleep(5)
        open_browser()
        
        # Start monitoring thread for user input
        input_thread = threading.Thread(target=monitor_user_input)
        input_thread.daemon = True
        input_thread.start()
        
        # Keep the main thread alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nExiting...")
            stop_services_on_exit()
            sys.exit(0)