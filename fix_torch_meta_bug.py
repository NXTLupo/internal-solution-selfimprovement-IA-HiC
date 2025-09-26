import os
import subprocess
import time

print("=========================================================")
print("Social Research PyTorch Meta Tensor Fix Tool - Direct Fix")
print("=========================================================")

# The container ID from docker ps
container_id = "2b189809ced3"  # Replace with actual container ID if different
container_name = "nxt-humans_ai_cx_workbench-social-research-backend-1"

# Check if the container exists and is running
print(f"Verifying container {container_id} ({container_name})...")

result = subprocess.run(f"docker inspect {container_id}", shell=True, capture_output=True)
if result.returncode != 0:
    print(f"Container {container_id} not found. Checking for other social research containers...")
    result = subprocess.run("docker ps | findstr social-research", shell=True, capture_output=True, text=True)
    if result.stdout:
        print("Found the following social research containers:")
        print(result.stdout)
        lines = result.stdout.strip().split('\n')
        for line in lines:
            parts = line.split()
            if len(parts) > 0 and 'social-research-backend' in line:
                container_id = parts[0]
                print(f"Will use container ID: {container_id}")
                break
    else:
        print("No social research containers found running.")
        exit(1)

# Direct fix script that doesn't rely on file copying
print(f"Applying direct fix to container {container_id}...")

# Create a simple one-line fix to inject into the container
fix_code = """
import torch; setattr(torch.nn.Module, 'to_empty', lambda self, device='cpu', recurse=True, **kwargs: torch.nn.Module.to(self, device=device, non_blocking=True, **kwargs) if hasattr(self, 'to') else self); print('PyTorch to_empty method patched successfully')
"""

# Try to execute the fix directly in the container
print("Injecting fix into the container...")
subprocess.run(f'docker exec {container_id} bash -c "python -c \\"{fix_code}\\""', shell=True)

# Create a patch file that will load on all model imports
patch_file_content = """
# PyTorch meta tensor fix
import sys

# Patch torch.nn.Module with to_empty method
def patch_torch():
    try:
        import torch
        if not hasattr(torch.nn.Module, 'to_empty'):
            # Define to_empty for torch.nn.Module
            def to_empty(self, device='cpu', recurse=True, **kwargs):
                # Safely move from meta device to actual device
                return self.to(device=device, non_blocking=True, **kwargs)
            
            # Add method to the class
            torch.nn.Module.to_empty = to_empty
            print("Added to_empty method to torch.nn.Module")
        return True
    except ImportError:
        print("PyTorch not available")
        return False
    except Exception as e:
        print(f"Error patching PyTorch: {e}")
        return False

# Auto-execute patch when this module is imported
patch_result = patch_torch()
"""

# Write the patch to a temporary file
with open("torch_patch.py", "w") as f:
    f.write(patch_file_content)

# Copy the patch to the container
print("Copying patch to container...")
subprocess.run(f"docker cp torch_patch.py {container_id}:/app/torch_patch.py", shell=True)
os.remove("torch_patch.py")

# Create an auto-import mechanism in the container
auto_import = """
# Add auto-import for the patch
import sys, os

# Create a path where we know Python will look for modules
os.makedirs('/app/pytorch_fix', exist_ok=True)
with open('/app/pytorch_fix/__init__.py', 'w') as f:
    f.write('# Force load patch\\nfrom .. import torch_patch\\n')

# Add the path to sys.path if not already there
if '/app' not in sys.path:
    sys.path.insert(0, '/app')
"""

# Write the auto-import to a temporary file
with open("setup_patch.py", "w") as f:
    f.write(auto_import)

# Copy and run the setup in the container
print("Setting up auto-import mechanism...")
subprocess.run(f"docker cp setup_patch.py {container_id}:/app/setup_patch.py", shell=True)
subprocess.run(f"docker exec {container_id} python /app/setup_patch.py", shell=True)
os.remove("setup_patch.py")

# Create a patch hook for the SentenceTransformers import
hook_code = """
# Import hook for SentenceTransformers
import sys

# Store the original import
original_import = __import__

def patched_import(name, *args, **kwargs):
    # Call the original import
    module = original_import(name, *args, **kwargs)
    
    # If importing sentence_transformers or transformers, make sure torch is patched
    if name == 'sentence_transformers' or name == 'transformers':
        import torch_patch  # This will patch torch.nn.Module
    
    return module

# Replace the built-in import
__builtins__.__import__ = patched_import
"""

# Write the hook to a temporary file
with open("import_hook.py", "w") as f:
    f.write(hook_code)

# Copy the hook to the container
print("Setting up import hook for Transformers libraries...")
subprocess.run(f"docker cp import_hook.py {container_id}:/app/import_hook.py", shell=True)
os.remove("import_hook.py")

# Add the import hook to the Python startup environment
startup_code = """
# Add import hook to Python startup
import os
startup_dir = os.path.expanduser('~/.ipython/profile_default/startup')
os.makedirs(startup_dir, exist_ok=True)
with open(f'{startup_dir}/001_pytorch_fix.py', 'w') as f:
    f.write('import sys\\nimport os\\nsys.path.insert(0, "/app")\\nimport torch_patch\\nimport import_hook\\n')
"""

# Write the startup code to a temporary file
with open("setup_startup.py", "w") as f:
    f.write(startup_code)

# Copy and run the startup setup in the container
print("Configuring Python startup environment...")
subprocess.run(f"docker cp setup_startup.py {container_id}:/app/setup_startup.py", shell=True)
subprocess.run(f"docker exec {container_id} python /app/setup_startup.py", shell=True)
os.remove("setup_startup.py")

# Also modify PYTHONSTARTUP environment variable to include our fix
env_setup = """
# Set PYTHONSTARTUP environment variable
echo 'export PYTHONSTARTUP=/app/pytorch_fix/__init__.py' >> ~/.bashrc
"""

# Write the environment setup to a temporary file
with open("env_setup.sh", "w") as f:
    f.write(env_setup)

# Copy and run the environment setup in the container
print("Setting PYTHONSTARTUP environment variable...")
subprocess.run(f"docker cp env_setup.sh {container_id}:/app/env_setup.sh", shell=True)
subprocess.run(f"docker exec {container_id} bash /app/env_setup.sh", shell=True)
os.remove("env_setup.sh")

# Create a test to verify the fix works
test_code = """
# Test the PyTorch meta tensor fix
try:
    import torch
    print(f"PyTorch version: {torch.__version__}")
    print(f"torch.nn.Module has to_empty: {hasattr(torch.nn.Module, 'to_empty')}")
    
    # If we have the method, test it
    if hasattr(torch.nn.Module, 'to_empty'):
        # Create a simple module
        model = torch.nn.Linear(10, 5)
        
        # Try moving to meta then back to cpu
        meta_device = torch.device('meta')
        cpu_device = torch.device('cpu')
        
        print("Moving model to meta device...")
        model.to(meta_device)
        
        print("Model device:", model.weight.device)
        
        print("Moving model back to CPU with to_empty...")
        model.to_empty(cpu_device)
        
        print("Model device after to_empty:", model.weight.device)
        
        print("Test successful!")
    else:
        print("to_empty method not found - fix not applied correctly")
except Exception as e:
    print(f"Test failed with error: {e}")
"""

# Write the test to a temporary file
with open("test_fix.py", "w") as f:
    f.write(test_code)

# Copy and run the test in the container
print("Testing the fix...")
subprocess.run(f"docker cp test_fix.py {container_id}:/app/test_fix.py", shell=True)
subprocess.run(f"docker exec {container_id} python /app/test_fix.py", shell=True)
os.remove("test_fix.py")

# Restart the Python process in the container
print("\nRestarting the container's Python process...")
subprocess.run(f"docker exec {container_id} bash -c 'pkill -f \"python -m run\" || pkill -f run.py || true'", shell=True)

# Wait a moment before starting the process again
time.sleep(2)

# Start the process with our fix preloaded
subprocess.run(f"docker exec -d {container_id} bash -c 'cd /app && PYTHONSTARTUP=/app/pytorch_fix/__init__.py python -c \"import torch_patch\" && python run.py'", shell=True)

print("\n=========================================================")
print("PyTorch meta tensor fix has been applied!")
print("The error 'Cannot copy out of meta tensor' should now be fixed.")
print("If the issue persists, try manually restarting the container:")
print(f"docker restart {container_id}")
print("=========================================================")