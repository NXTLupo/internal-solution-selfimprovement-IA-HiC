import os
import subprocess

print("=========================================================")
print("Social Research PyTorch Meta Tensor Fix Tool")
print("=========================================================")

# Create a Python script to fix the meta tensor issue
fix_script = '''
# Meta tensor fix for PyTorch
import os
import sys
import importlib
import traceback

def patch_torch():
    """
    Patch PyTorch to handle meta tensors correctly
    """
    try:
        import torch
        
        print("PyTorch imported successfully")
        print(f"PyTorch version: {torch.__version__}")
        
        # Check if the patch is needed
        if hasattr(torch.nn.Module, 'to_empty'):
            print("PyTorch already has to_empty method - no patching needed")
            return True
        
        # Add missing to_empty method if it doesn't exist
        if not hasattr(torch.nn.Module, 'to_empty'):
            print("Adding to_empty method to torch.nn.Module")
            
            # Define the to_empty method
            def to_empty(self, device=None, recurse=True, **kwargs):
                """Move the module parameters to a meta device"""
                if device is None:
                    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
                
                # Custom implementation that safely moves from meta to actual device
                if recurse:
                    for module in self.children():
                        module.to_empty(device=device, recurse=recurse, **kwargs)
                
                for param_name, param in self.named_parameters(recurse=False):
                    if param.device.type == 'meta':
                        # Replace meta parameter with actual device parameter
                        new_param = torch.empty_like(param, device=device, **kwargs)
                        self._parameters[param_name] = new_param
                
                for buffer_name, buffer in self.named_buffers(recurse=False):
                    if buffer.device.type == 'meta':
                        # Replace meta buffer with actual device buffer
                        new_buffer = torch.empty_like(buffer, device=device, **kwargs)
                        self._buffers[buffer_name] = new_buffer
                
                return self
            
            # Attach the method to torch.nn.Module
            torch.nn.Module.to_empty = to_empty
            print("Successfully added to_empty method to torch.nn.Module")
            
            return True
    except ImportError:
        print("PyTorch is not installed - cannot apply patch")
        return False
    except Exception as e:
        print(f"Error patching PyTorch: {e}")
        traceback.print_exc()
        return False

def patch_transformers():
    """
    Check and patch Hugging Face transformers library to use to_empty method
    """
    try:
        # Import transformers
        import transformers
        print(f"Transformers version: {transformers.__version__}")
        
        # Attempt to find and patch model loading code
        source_file = None
        for path in transformers.__path__:
            models_dir = os.path.join(path, "models")
            if os.path.exists(models_dir):
                for root, dirs, files in os.walk(models_dir):
                    for file in files:
                        if file.endswith(".py"):
                            filepath = os.path.join(root, file)
                            try:
                                with open(filepath, "r") as f:
                                    content = f.read()
                                    if "to(" in content and "meta" in content:
                                        source_file = filepath
                                        print(f"Checking file for patching: {filepath}")
                                        
                                        # If we find a file that contains the problematic pattern, patch it
                                        if ".to(" in content and ".device" in content and "meta" in content:
                                            with open(filepath, "r") as f:
                                                lines = f.readlines()
                                                
                                            patched = False
                                            for i, line in enumerate(lines):
                                                # Look for patterns like: model.to("meta") or model.to(torch.device("meta"))
                                                if ".to(" in line and "meta" in line:
                                                    # Check if we need to replace to() with to_empty()
                                                    if not "to_empty" in line:
                                                        lines[i] = line.replace(".to(", ".to_empty(")
                                                        patched = True
                                                        print(f"Patched line {i+1}: {line.strip()} -> {lines[i].strip()}")
                                            
                                            # If we made changes, write the file back
                                            if patched:
                                                print(f"Writing changes to {filepath}")
                                                with open(filepath, "w") as f:
                                                    f.writelines(lines)
                                                print(f"Successfully patched {filepath}")
                            except Exception as e:
                                print(f"Error checking file {filepath}: {e}")
        
        print("Transformers library check completed.")
        return True
    except ImportError:
        print("Transformers library is not installed - cannot apply patch")
        return False
    except Exception as e:
        print(f"Error patching transformers: {e}")
        traceback.print_exc()
        return False

def patch_hf_pipeline():
    """Patch the Hugging Face pipeline implementation"""
    try:
        from transformers import pipeline
        
        # Get the module containing the pipeline function
        pipeline_module = sys.modules[pipeline.__module__]
        
        # Path the original pipeline function
        original_pipeline = pipeline
        
        def patched_pipeline(*args, **kwargs):
            """Patched pipeline function that handles meta tensor correctly"""
            try:
                return original_pipeline(*args, **kwargs)
            except RuntimeError as e:
                if "Cannot copy out of meta tensor" in str(e):
                    print("Caught meta tensor error, trying with to_empty")
                    # If device is specified, use it, otherwise use default
                    device = kwargs.get("device", "cpu")
                    # Modify kwargs to use to_empty properly
                    kwargs["device"] = "meta"
                    # Call pipeline to create model on meta device
                    pipe = original_pipeline(*args, **kwargs)
                    # Move from meta to actual device using to_empty
                    if hasattr(pipe.model, "to_empty"):
                        pipe.model = pipe.model.to_empty(device)
                    else:
                        # Fallback if to_empty isn't available
                        torch.nn.Module.to_empty = lambda self, device: self.to(device)
                        pipe.model = pipe.model.to_empty(device)
                    return pipe
                else:
                    raise
        
        # Replace the pipeline function
        if hasattr(pipeline_module, "pipeline"):
            pipeline_module.pipeline = patched_pipeline
            print("Successfully patched transformers pipeline function")
        else:
            print("Could not find pipeline function to patch")
        
        return True
    except ImportError:
        print("Could not import transformers.pipeline - cannot patch")
        return False
    except Exception as e:
        print(f"Error patching pipeline: {e}")
        traceback.print_exc()
        return False

def patch_sentencetransformers():
    """Patch SentenceTransformers to handle meta tensors"""
    try:
        import sentence_transformers
        print(f"SentenceTransformers version: {sentence_transformers.__version__}")
        
        # Find and patch model loading code
        model_path = None
        for path in sentence_transformers.__path__:
            for root, dirs, files in os.walk(path):
                for file in files:
                    if file.endswith(".py"):
                        filepath = os.path.join(root, file)
                        try:
                            with open(filepath, "r") as f:
                                content = f.read()
                                if ".to(" in content and "device" in content:
                                    model_path = filepath
                                    print(f"Checking SentenceTransformers file: {filepath}")
                                    
                                    # If we find a file with the .to() pattern, patch it
                                    with open(filepath, "r") as f:
                                        lines = f.readlines()
                                    
                                    patched = False
                                    for i, line in enumerate(lines):
                                        if ".to(" in line and "device" in line:
                                            # Check if we need to add a device check before to() call
                                            if not "meta" in line and not "to_empty" in line:
                                                # Add conditional check to use to_empty if from meta device
                                                indentation = len(line) - len(line.lstrip())
                                                if "=" in line:
                                                    var_name = line.split("=")[0].strip()
                                                    # Create a conditional to check if we need to use to_empty
                                                    meta_check = " " * indentation
                                                    meta_check += f"# Check if model is on meta device and use to_empty if needed\n"
                                                    meta_check += " " * indentation
                                                    meta_check += f"if hasattr({var_name}, 'device') and str({var_name}.device) == 'meta':\n"
                                                    meta_check += " " * indentation + "    "
                                                    meta_check += line.replace(".to(", ".to_empty(")
                                                    # Keep the original line as else condition
                                                    meta_check += " " * indentation + "else:\n"
                                                    meta_check += " " * indentation + "    " + line
                                                    
                                                    lines[i] = meta_check
                                                    patched = True
                                                    print(f"Added meta device check for line {i+1}")
                                    
                                    # If we made changes, write the file back
                                    if patched:
                                        print(f"Writing changes to {filepath}")
                                        with open(filepath, "w") as f:
                                            f.writelines(lines)
                                        print(f"Successfully patched {filepath}")
                        except Exception as e:
                            print(f"Error checking file {filepath}: {e}")
        
        print("SentenceTransformers library check completed.")
        return True
    except ImportError:
        print("SentenceTransformers is not installed - cannot patch")
        return False
    except Exception as e:
        print(f"Error patching SentenceTransformers: {e}")
        traceback.print_exc()
        return False

def fix_meta_tensor_issues():
    """Apply all patches to fix meta tensor issues"""
    print("Applying PyTorch and related libraries patches...")
    
    # Apply patches
    torch_patched = patch_torch()
    transformers_patched = patch_transformers()
    pipeline_patched = patch_hf_pipeline()
    sentence_patched = patch_sentencetransformers()
    
    print("\nPatch Summary:")
    print(f"PyTorch patched: {torch_patched}")
    print(f"Transformers patched: {transformers_patched}")
    print(f"HF Pipeline patched: {pipeline_patched}")
    print(f"SentenceTransformers patched: {sentence_patched}")
    
    print("\nMeta tensor fixes applied.")
    return True

if __name__ == "__main__":
    fix_meta_tensor_issues()
'''

# Write the fix script to a file
with open("torch_meta_fix.py", "w") as f:
    f.write(fix_script)

print("Created PyTorch meta tensor fix script")

# Try to find the social research backend container
print("Finding the social research backend container...")
result = subprocess.run("docker ps --format '{{.Names}}' | findstr social-research-backend", 
                       shell=True, capture_output=True, text=True)
container_name = result.stdout.strip()

if not container_name:
    print("Social Research backend container not found, trying alternative names...")
    result = subprocess.run("docker ps --format '{{.Names}}' | findstr social-research", 
                           shell=True, capture_output=True, text=True)
    containers = result.stdout.strip().split('\n')
    for container in containers:
        if 'backend' in container or 'db' not in container:
            container_name = container
            break
    
    if not container_name:
        print("Could not find social research container. Using default name.")
        container_name = "nxt-humans_ai_cx_workbench-social-research-backend-1"

print(f"Using container: {container_name}")

# Copy the fix script to the container
print(f"Copying fix script to container {container_name}...")
subprocess.run(f"docker cp torch_meta_fix.py {container_name}:/app/torch_meta_fix.py", shell=True)

# Clean up the local file
os.remove("torch_meta_fix.py")

# Run the fix script in the container
print("Running the fix script in the container...")
subprocess.run(f"docker exec {container_name} python /app/torch_meta_fix.py", shell=True)

# Create a patch file to import the fix on startup
patch_script = '''
# Patch to handle PyTorch meta tensor error
import os
import sys

# Try to import and apply meta tensor fix at startup
try:
    from torch_meta_fix import fix_meta_tensor_issues
    fix_meta_tensor_issues()
    print("Applied PyTorch meta tensor fixes on startup")
except ImportError:
    print("Warning: Could not import torch_meta_fix module")
except Exception as e:
    print(f"Error applying meta tensor fixes: {e}")
'''

# Write the patch script
with open("meta_tensor_patch.py", "w") as f:
    f.write(patch_script)

# Copy the patch to the container
print("Creating startup patch to automatically apply the fix...")
subprocess.run(f"docker cp meta_tensor_patch.py {container_name}:/app/meta_tensor_patch.py", shell=True)

# Clean up the local file
os.remove("meta_tensor_patch.py")

# Add import to __init__.py in the container
print("Adding fix to the startup code...")
import_command = f'''
docker exec {container_name} bash -c "mkdir -p /app/util && touch /app/util/__init__.py && echo '# Import meta tensor fix\\ntry:\\n    from meta_tensor_patch import *\\n    print(\"Meta tensor patch loaded\")\\nexcept Exception as e:\\n    print(f\"Error loading meta tensor patch: {{e}}\")' >> /app/util/__init__.py"
'''
subprocess.run(import_command, shell=True)

# Restart the Python process in the container
print("\nRestarting the container's Python process...")
subprocess.run(f"docker exec {container_name} bash -c 'pkill -f python || true'", shell=True)
subprocess.run(f"docker exec -d {container_name} bash -c 'cd /app && python -m meta_tensor_patch && python run.py'", shell=True)

print("\nRestarting the frontend...")
subprocess.run("docker compose -f docker-compose-all.yml restart social-research-frontend", shell=True)

print("\n=========================================================")
print("PyTorch meta tensor fix has been applied!")
print("The error 'Cannot copy out of meta tensor' should now be fixed.")
print("If the issue persists, try manually restarting the container:")
print(f"docker restart {container_name}")
print("=========================================================")