#!/usr/bin/env python3
"""
Docker Container Host Updater for NXT HUMANS AI CX WORKBENCH

This script updates the Docker Compose files with the correct IP addresses
for container-to-container communication, particularly for the agent service.
"""

import os
import sys
import subprocess
import re
import time
import json

def get_container_ip(container_name):
    """Get the IP address of a running Docker container."""
    try:
        # Try to get the IP address using Docker inspect
        cmd = ['docker', 'inspect', '-f', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', container_name]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception as e:
        print(f"Error getting container IP: {e}")
    
    return None

def update_compose_file(file_path, container_mappings):
    """Update the extra_hosts section in a Docker Compose file."""
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return False
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # For each container mapping, update the extra_hosts
        for container_name, ip_address in container_mappings.items():
            # Look for existing extra_hosts entries
            extra_hosts_pattern = re.compile(
                r'(extra_hosts:(?:\n\s+-\s+[^\n]+)*\n\s+-\s+"{0}:)([^"]+)(")'
                .format(re.escape(container_name))
            )
            
            if extra_hosts_pattern.search(content):
                # Update existing entry
                content = extra_hosts_pattern.sub(r'\1{0}\3'.format(ip_address), content)
            else:
                # Add a new extra_hosts section if needed - this is more complex
                # We'll need to find the service and add the extra_hosts section
                service_pattern = re.compile(r'(  launchpad:\n(?:    [^\n]+\n)+)', re.MULTILINE)
                match = service_pattern.search(content)
                
                if match:
                    service_def = match.group(1)
                    if 'extra_hosts:' not in service_def:
                        # Add extra_hosts section
                        indented_hosts = f"    extra_hosts:\n      - \"{container_name}:{ip_address}\"\n"
                        content = service_pattern.sub(f"{service_def}{indented_hosts}", content)
                    else:
                        # Add to existing extra_hosts section
                        extra_hosts_section = re.compile(r'(    extra_hosts:\n(?:      - [^\n]+\n)*)', re.MULTILINE)
                        hosts_match = extra_hosts_section.search(content)
                        if hosts_match:
                            hosts_section = hosts_match.group(1)
                            new_entry = f"      - \"{container_name}:{ip_address}\"\n"
                            content = extra_hosts_section.sub(f"{hosts_section}{new_entry}", content)
        
        # Write the updated content back to the file
        with open(file_path, 'w') as f:
            f.write(content)
        
        print(f"Updated {file_path} with container IPs: {json.dumps(container_mappings, indent=2)}")
        return True
    
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
        return False

def ensure_agent_container_running():
    """Make sure the agent container is running."""
    try:
        # Check if agent container is running
        result = subprocess.run(
            ['docker', 'ps', '--filter', 'name=agent', '--format', '{{.Names}}'],
            capture_output=True, text=True
        )
        
        if 'agent' not in result.stdout:
            # Start the container if it's not running
            print("Agent container not running. Starting it...")
            subprocess.run(['docker', 'compose', '-f', 'docker-compose-agent.yml', 'up', '-d', 'agent'], check=True)
            # Wait for it to start
            print("Waiting for agent container to start...")
            time.sleep(10)
    except Exception as e:
        print(f"Error checking agent container: {e}")
        return False
    
    return True

def start_all_containers():
    """Start all the containers defined in docker-compose-agent.yml."""
    try:
        subprocess.run(['docker', 'compose', '-f', 'docker-compose-agent.yml', 'up', '-d'], check=True)
        print("All containers started successfully.")
        return True
    except Exception as e:
        print(f"Error starting containers: {e}")
        return False

def main():
    """Main function."""
    # Ensure the script is run from the project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    compose_files = [
        'docker-compose-agent.yml',
        'dynamic-compose.yml'
    ]
    
    # Ensure agent container is running
    if not ensure_agent_container_running():
        print("Could not ensure agent container is running. Exiting.")
        return 1
    
    # Get agent container IP
    agent_ip = get_container_ip('agent')
    if not agent_ip:
        print("Could not determine agent container IP. Exiting.")
        return 1
    
    print(f"Agent container IP: {agent_ip}")
    
    container_mappings = {
        "agent": agent_ip
    }
    
    # Update compose files
    for compose_file in compose_files:
        if os.path.exists(compose_file):
            update_compose_file(compose_file, container_mappings)
    
    # Optionally restart all services if requested
    if len(sys.argv) > 1 and sys.argv[1] == '--restart':
        print("Restarting all containers with updated configuration...")
        start_all_containers()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())