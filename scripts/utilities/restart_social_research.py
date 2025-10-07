#!/usr/bin/env python
"""
Script to restart the Social Research Tool backend to apply our fixes
"""
import os
import sys
import subprocess
import time

def restart_social_research():
    print("Restarting the Social Research Tool backend...")
    
    # Get the container name
    try:
        # List all containers with the name containing 'social-research'
        result = subprocess.run(
            "docker ps --filter name=social-research -a --format '{{.Names}}'",
            shell=True, capture_output=True, text=True
        )
        
        containers = result.stdout.strip().split('\n')
        backend_container = None
        
        for container in containers:
            if 'backend' in container.lower() and container.strip():
                backend_container = container.strip()
                break
                
        if not backend_container:
            print("Could not find Social Research backend container. Is Docker running?")
            return False
            
        print(f"Found backend container: {backend_container}")
        
        # Restart the backend container
        print(f"Restarting container: {backend_container}")
        restart_result = subprocess.run(
            f"docker restart {backend_container}",
            shell=True, capture_output=True, text=True
        )
        
        if restart_result.returncode != 0:
            print(f"Error restarting container: {restart_result.stderr}")
            return False
            
        print(f"Container {backend_container} restarted successfully")
        
        # Wait for container to be ready
        print("Waiting for container to be ready...")
        time.sleep(10)
        
        # Check container status
        status_result = subprocess.run(
            f"docker ps --filter name={backend_container} --format '{{{{.Status}}}}'",
            shell=True, capture_output=True, text=True
        )
        
        status = status_result.stdout.strip()
        print(f"Container status: {status}")
        
        if "Up" not in status:
            print("Container did not restart properly")
            return False
            
        print("Social Research backend has been restarted successfully!")
        return True
        
    except subprocess.SubprocessError as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    if restart_social_research():
        print("\nThe Social Research Tool backend has been restarted with the fixes applied.")
        print("Please verify that the tool is working correctly.")
    else:
        print("\nFailed to restart the Social Research Tool backend.")
        print("Please try manually restarting the container.")