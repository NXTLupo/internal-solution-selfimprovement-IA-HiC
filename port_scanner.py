#!/usr/bin/env python3
"""
Port Scanner for NXT HUMANS AI CX WORKBENCH

This script scans and analyzes potential port conflicts for the workbench
services and suggests available ports. It can be used standalone or imported
by other scripts to provide port conflict detection and resolution.
"""

import os
import sys
import socket
import subprocess
import json
import platform
import time
from typing import Dict, List, Tuple, Optional

# Default port configuration
DEFAULT_PORTS = {
    "LAUNCHPAD_PORT": 8000,
    "JOURNEY_MAPPER_PORT": 8080,
    "REDDIT_RIPPER_PORT": 5001,
    "SOCIAL_RESEARCH_PORT": 3000,
    "SOCIAL_RESEARCH_BACKEND_PORT": 8081,
    "AGENT_PORT": 8500,
    "REDDIT_MCP_PORT": 8501,
    "SOCIAL_MCP_PORT": 8502,
    "JOURNEY_MCP_PORT": 8503
}

# ANSI color codes for terminal output
COLORS = {
    "GREEN": "\033[0;32m",
    "BLUE": "\033[0;34m",
    "YELLOW": "\033[1;33m",
    "RED": "\033[0;31m",
    "NC": "\033[0m"  # No Color
}

def colored(text: str, color: str) -> str:
    """Return colored text for terminal output"""
    if sys.platform == "win32" and not os.environ.get("TERM") == "xterm":
        return text  # No colors on Windows unless in xterm
    return f"{COLORS.get(color, COLORS['NC'])}{text}{COLORS['NC']}"

def is_port_in_use(port: int) -> bool:
    """Check if a port is in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def get_process_using_port(port: int) -> Tuple[Optional[int], Optional[str]]:
    """Return PID and name of process using the specified port."""
    pid = None
    process_name = None

    try:
        if platform.system() == "Windows":
            # Windows - use netstat
            output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode('utf-8')
            if output:
                pid = int(output.strip().split()[-1])
                try:
                    process_info = subprocess.check_output(f"tasklist /fi \"PID eq {pid}\"", shell=True).decode('utf-8')
                    process_name = process_info.split('\n')[3].split()[0] if len(process_info.split('\n')) > 3 else "Unknown"
                except:
                    process_name = "Unknown"
        else:
            # Unix-like systems - use lsof
            try:
                output = subprocess.check_output(f"lsof -i :{port} -t", shell=True).decode('utf-8')
                if output:
                    pid = int(output.strip())
                    try:
                        pname = subprocess.check_output(f"ps -p {pid} -o comm=", shell=True).decode('utf-8')
                        process_name = pname.strip()
                    except:
                        process_name = "Unknown"
            except subprocess.CalledProcessError:
                pass  # Command returned non-zero exit status, port probably not in use
    except:
        pass  # Any exception means we couldn't determine what's using the port

    return pid, process_name

def find_available_port(start_port: int, max_attempts: int = 100) -> int:
    """Find an available port starting from start_port."""
    port = start_port
    attempts = 0
    
    while attempts < max_attempts:
        if not is_port_in_use(port):
            return port
        port += 1
        attempts += 1
    
    # If we can't find an available port within range
    return 0

def scan_ports(ports: Dict[str, int] = None) -> Dict[str, Dict]:
    """
    Scan the specified ports and return detailed information about each.
    
    Returns a dictionary with port information including:
    - in_use: boolean indicating if port is in use
    - pid: process ID using the port (if any)
    - process_name: name of the process using the port (if any)
    - alternative_port: suggested alternative if port is in use
    """
    if ports is None:
        ports = DEFAULT_PORTS
    
    result = {}
    
    for service_name, port in ports.items():
        port_info = {
            "port": port,
            "in_use": False,
            "pid": None,
            "process_name": None,
            "alternative_port": None
        }
        
        # Check if port is in use
        if is_port_in_use(port):
            port_info["in_use"] = True
            pid, process_name = get_process_using_port(port)
            port_info["pid"] = pid
            port_info["process_name"] = process_name
            
            # Find alternative port
            alt_port = find_available_port(port + 1)
            if alt_port > 0:
                port_info["alternative_port"] = alt_port
        
        result[service_name] = port_info
    
    return result

def kill_process(pid: int) -> bool:
    """
    Kill a process by its PID.
    Returns True if successful, False otherwise.
    """
    try:
        if platform.system() == "Windows":
            subprocess.check_call(f"taskkill /F /PID {pid}", shell=True)
        else:
            subprocess.check_call(f"kill -9 {pid}", shell=True)
        # Give the OS a moment to release the port
        time.sleep(1)
        return True
    except:
        return False

def update_env_file(port_updates: Dict[str, int], env_path: str = ".env") -> bool:
    """
    Update the .env file with new port assignments.
    Returns True if successful, False otherwise.
    """
    try:
        # Read existing .env file or create template
        env_content = ""
        env_lines = []
        
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_content = f.read()
                env_lines = env_content.split('\n')
        
        # Process each line, updating ports where needed
        updated_lines = []
        updated_ports = set()
        
        for line in env_lines:
            line = line.strip()
            if not line or line.startswith('#'):
                updated_lines.append(line)
                continue
                
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                
                if key in port_updates:
                    updated_lines.append(f"{key}={port_updates[key]}")
                    updated_ports.add(key)
                else:
                    updated_lines.append(line)
            else:
                updated_lines.append(line)
        
        # Add any missing port configurations
        for key, value in port_updates.items():
            if key not in updated_ports:
                updated_lines.append(f"{key}={value}")
        
        # Write back to .env file
        with open(env_path, 'w') as f:
            f.write('\n'.join(updated_lines))
        
        return True
    except Exception as e:
        print(f"Error updating .env file: {e}")
        return False

def get_port_recommendations(scan_results: Dict[str, Dict]) -> Dict[str, int]:
    """
    Based on scan results, determine recommended port configuration.
    Uses alternative ports for services with conflicts.
    """
    recommendations = {}
    
    for service_name, info in scan_results.items():
        if info["in_use"] and info["alternative_port"]:
            recommendations[service_name] = info["alternative_port"]
        else:
            recommendations[service_name] = info["port"]
    
    return recommendations

def print_scan_results(scan_results: Dict[str, Dict]) -> None:
    """Print human-readable scan results to console."""
    print(colored("\nPORT SCAN RESULTS:", "BLUE"))
    print("-" * 60)
    
    any_conflicts = False
    
    for service_name, info in scan_results.items():
        port = info["port"]
        status = "AVAILABLE"
        status_color = "GREEN"
        
        if info["in_use"]:
            any_conflicts = True
            status = "IN USE"
            status_color = "RED"
            process_detail = f"by PID {info['pid']} ({info['process_name']})" if info['pid'] else "by unknown process"
            
            print(f"{service_name} (Port {port}): {colored(status, status_color)} {process_detail}")
            if info["alternative_port"]:
                print(f"  - Suggested alternative: Port {info['alternative_port']}")
        else:
            print(f"{service_name} (Port {port}): {colored(status, status_color)}")
    
    print("-" * 60)
    
    if any_conflicts:
        print(colored("\nCONFLICT RESOLUTION INSTRUCTIONS:", "YELLOW"))
        print(colored("1. Manually kill the processes using conflicting ports using:", "YELLOW"))
        if platform.system() == "Windows":
            print("   taskkill /F /PID [PID]")
        else:
            print("   kill -9 [PID]")
        print(colored("2. Use alternative ports as suggested above", "YELLOW"))
        print(colored("3. Run this script with --fix to automatically assign alternative ports", "YELLOW"))
    else:
        print(colored("\nAll ports are available. No conflicts detected.", "GREEN"))

def fix_port_conflicts(scan_results: Dict[str, Dict], force_kill: bool = False) -> Dict[str, int]:
    """
    Fix port conflicts by either killing processes or selecting alternative ports.
    
    Args:
        scan_results: Results from the scan_ports function
        force_kill: If True, attempt to kill processes using conflicting ports
        
    Returns:
        Dictionary mapping service names to their assigned ports
    """
    port_assignments = {}
    
    for service_name, info in scan_results.items():
        if info["in_use"]:
            if force_kill and info["pid"]:
                # Try to kill the process
                print(f"Attempting to kill process {info['pid']} using port {info['port']}...")
                if kill_process(info["pid"]):
                    print(colored(f"Successfully killed process. Port {info['port']} is now available.", "GREEN"))
                    port_assignments[service_name] = info["port"]
                else:
                    print(colored(f"Failed to kill process. Using alternative port {info['alternative_port']}.", "YELLOW"))
                    port_assignments[service_name] = info["alternative_port"]
            else:
                # Use alternative port
                if info["alternative_port"]:
                    print(colored(f"Using alternative port {info['alternative_port']} for {service_name} (original port {info['port']} is in use)", "YELLOW"))
                    port_assignments[service_name] = info["alternative_port"]
                else:
                    print(colored(f"ERROR: No alternative port available for {service_name}", "RED"))
                    port_assignments[service_name] = 0  # Error indicator
        else:
            # Port is available, use it
            port_assignments[service_name] = info["port"]
    
    return port_assignments

def process_args() -> dict:
    """Process command line arguments."""
    args = {
        "fix": False,
        "kill": False,
        "json": False,
        "verbose": False
    }
    
    for arg in sys.argv[1:]:
        if arg == "--fix":
            args["fix"] = True
        elif arg == "--kill":
            args["kill"] = True
        elif arg == "--json":
            args["json"] = True
        elif arg == "--verbose" or arg == "-v":
            args["verbose"] = True
        elif arg == "--help" or arg == "-h":
            print_help()
            sys.exit(0)
    
    return args

def print_help() -> None:
    """Print help information."""
    help_text = """
PORT SCANNER FOR NXT HUMANS AI CX WORKBENCH

Usage: python port_scanner.py [options]

Options:
  --fix        Automatically fix port conflicts by updating .env file
  --kill       Kill processes using conflicting ports (use with caution)
  --json       Output results in JSON format (for programmatic use)
  --verbose    Show detailed information
  --help, -h   Show this help message

Description:
  This script scans for port conflicts that might prevent the NXT HUMANS
  AI CX WORKBENCH from starting properly. It can also automatically fix
  these conflicts by assigning alternative ports or killing conflicting
  processes.
"""
    print(help_text)

def main() -> None:
    """Main function when script is run directly."""
    args = process_args()
    
    # Scan ports
    if args["verbose"]:
        print(colored("Scanning ports for conflicts...", "BLUE"))
    
    scan_results = scan_ports()
    
    # Output results
    if args["json"]:
        print(json.dumps(scan_results, indent=2))
    else:
        print_scan_results(scan_results)
    
    # Fix conflicts if requested
    if args["fix"]:
        if args["verbose"]:
            print(colored("\nFixing port conflicts...", "BLUE"))
        
        port_assignments = fix_port_conflicts(scan_results, args["kill"])
        
        # Update .env file
        if args["verbose"]:
            print(colored("\nUpdating .env file with new port assignments...", "BLUE"))
        
        if update_env_file(port_assignments):
            print(colored("\nPort conflicts resolved successfully!", "GREEN"))
            print("New port assignments:")
            for service, port in port_assignments.items():
                print(f"  {service}: {port}")
        else:
            print(colored("\nFailed to update .env file with new port assignments.", "RED"))

if __name__ == "__main__":
    main()