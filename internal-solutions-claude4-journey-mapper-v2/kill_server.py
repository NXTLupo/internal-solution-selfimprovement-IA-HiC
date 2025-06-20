#!/usr/bin/env python3
import os
import signal
import subprocess
import sys
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
    except subprocess.CalledProcessError:
        return False
    except Exception as e:
        print(f"Error checking port {port}: {e}")
        return False

def get_pids_using_port(port):
    """Get PIDs of processes using a specific port"""
    pids = []
    try:
        # For macOS and Linux
        if sys.platform == 'darwin' or sys.platform.startswith('linux'):
            cmd = f"lsof -i:{port} -t"
            try:
                output = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode().strip()
                if output:
                    pids = [int(p) for p in output.split('\n') if p.strip()]
            except subprocess.CalledProcessError:
                pass
        # For Windows
        elif sys.platform == 'win32':
            cmd = f"netstat -ano | findstr :{port}"
            try:
                output = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode()
                if output:
                    lines = output.strip().split('\n')
                    for line in lines:
                        parts = line.strip().split()
                        if len(parts) >= 5:
                            try:
                                pid = int(parts[4])
                                if pid not in pids:
                                    pids.append(pid)
                            except ValueError:
                                pass
            except subprocess.CalledProcessError:
                pass
    except Exception as e:
        print(f"Error getting PIDs for port {port}: {e}")
    
    return pids

def kill_process_on_port(port=8080, max_attempts=3):
    """Kill any process running on the specified port with retries"""
    killed = False
    attempts = 0
    
    while attempts < max_attempts:
        attempts += 1
        try:
            pids = get_pids_using_port(port)
            
            if not pids:
                if attempts == 1:
                    print(f"No processes found on port {port}")
                break
                
            print(f"Attempt {attempts}: Found {len(pids)} process(es) on port {port}")
            
            # Try SIGTERM first (on first attempt)
            if attempts == 1:
                for pid in pids:
                    try:
                        print(f"Sending SIGTERM to process {pid} on port {port}")
                        os.kill(pid, signal.SIGTERM)
                        killed = True
                    except (ValueError, ProcessLookupError) as e:
                        print(f"Error terminating process {pid}: {e}")
                
                # Wait for processes to terminate
                if killed:
                    print(f"Waiting for port {port} to be freed...")
                    time.sleep(1)
            
            # If processes still exist, use SIGKILL (for retries)
            if is_port_in_use(port):
                pids = get_pids_using_port(port)
                for pid in pids:
                    try:
                        print(f"Sending SIGKILL to stubborn process {pid} on port {port}")
                        os.kill(pid, signal.SIGKILL)
                        killed = True
                    except (ValueError, ProcessLookupError) as e:
                        print(f"Error killing process {pid}: {e}")
                
                # Wait longer for SIGKILL to take effect
                if killed:
                    print(f"Waiting for port {port} to be freed after SIGKILL...")
                    time.sleep(2)
            
            # Verify port is actually free
            if not is_port_in_use(port):
                print(f"Successfully freed port {port}")
                return True
            
            # If we're here, port is still in use even after SIGKILL
            print(f"Port {port} is still in use after attempt {attempts}")
            
        except Exception as e:
            print(f"Error in attempt {attempts} killing process on port {port}: {e}")
        
        # Slight delay before next attempt
        if attempts < max_attempts:
            time.sleep(1)
    
    # Final check
    if is_port_in_use(port):
        print(f"⚠️ WARNING: Port {port} is still in use after {max_attempts} attempts!")
        return False
    else:
        return killed

def kill_processes_on_all_ports():
    """Kill processes on all ports that the application might use"""
    # Using non-restricted ports (all above 1024)
    app_ports = [5000, 8080, 3000]
    results = {}
    
    for port in app_ports:
        print(f"Checking port {port}...")
        killed = kill_process_on_port(port)
        results[port] = killed
        
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # If port specified as argument
        try:
            port = int(sys.argv[1])
            # Ensure port is not restricted
            if port < 1024:
                print(f"Warning: Port {port} is in the restricted range (0-1023).")
                port = 8080  # Default to a safe port
                print(f"Using port {port} instead.")
            
            if kill_process_on_port(port):
                print(f"Successfully killed process on port {port}")
            else:
                print(f"No process found on port {port}")
        except ValueError:
            print(f"Invalid port number: {sys.argv[1]}")
            sys.exit(1)
    else:
        # If no port specified, kill on all application ports
        print("Checking all application ports...")
        results = kill_processes_on_all_ports()
        
        killed_any = any(results.values())
        if killed_any:
            ports_killed = [port for port, killed in results.items() if killed]
            print(f"Successfully killed processes on ports: {', '.join(map(str, ports_killed))}")
        else:
            print("No processes found on any application ports")