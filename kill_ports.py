
import os
import re
import subprocess

def kill_processes_on_ports():
    """
    Reads the .env file, extracts all port numbers, and kills any processes
    listening on those ports.
    """
    env_file = ".env"
    if not os.path.exists(env_file):
        print(f"Error: {env_file} not found.")
        return

    print("Reading port configurations from .env file...")
    port_configs = []
    with open(env_file, "r") as f:
        for line in f:
            if line.strip() and not line.strip().startswith("#"):
                match = re.match(r"^\w+_PORT=(\d+)", line.strip())
                if match:
                    port = int(match.group(1))
                    port_configs.append(port)

    if not port_configs:
        print("No port configurations found in .env file.")
        return

    print(f"Found {len(port_configs)} port configurations: {port_configs}")

    for port in port_configs:
        print(f"\n--- Checking port {port} ---")
        try:
            # Find the process ID (PID) using the port
            command = f"netstat -ano | findstr :{port}"
            result = subprocess.run(command, shell=True, capture_output=True, text=True)

            if result.stdout:
                lines = result.stdout.strip().split("\n")
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        # Ensure the port matches exactly
                        local_address = parts[1]
                        if f":{port}" in local_address:
                            print(f"Port {port} is in use by PID: {pid}")
                            try:
                                # Kill the process
                                kill_command = f"taskkill /F /PID {pid}"
                                print(f"Executing: {kill_command}")
                                kill_result = subprocess.run(kill_command, shell=True, capture_output=True, text=True)
                                if kill_result.returncode == 0:
                                    print(f"Successfully killed process with PID: {pid}")
                                else:
                                    print(f"Failed to kill process with PID: {pid}")
                                    print(f"Error: {kill_result.stderr.strip()}")
                            except Exception as e:
                                print(f"An error occurred while trying to kill PID {pid}: {e}")
            else:
                print(f"Port {port} is not in use.")

        except Exception as e:
            print(f"An error occurred while checking port {port}: {e}")

if __name__ == "__main__":
    kill_processes_on_ports()
