import os

def patch_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace system role with user role in message format
    patched_content = content.replace('"role": "user"', '"role": "user"')
    patched_content = patched_content.replace("role': 'user'", "role': 'user'")
    patched_content = patched_content.replace('role="user"', 'role="user"')
    patched_content = patched_content.replace('role=\"system\"', 'role=\"user\"')
    
    if content != patched_content:
        # Create backup
        with open(f'{file_path}.bak', 'w') as f:
            f.write(content)
        
        # Write patched content
        with open(file_path, 'w') as f:
            f.write(patched_content)
        
        print(f'Patched {file_path} (backup created at {file_path}.bak)')
        return True
    
    return False

# Patch all Python files
import glob
python_files = glob.glob('/app/**/*.py', recursive=True)

patched_files = []
for file in python_files:
    if os.access(file, os.W_OK):
        if patch_file(file):
            patched_files.append(file)

if patched_files:
    print(f'\nPatched {len(patched_files)} files:')
    for file in patched_files:
        print(f'- {file}')
else:
    print('\nNo files needed patching')
