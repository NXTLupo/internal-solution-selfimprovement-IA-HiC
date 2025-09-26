
# Add import hook to Python startup
import os
startup_dir = os.path.expanduser('~/.ipython/profile_default/startup')
os.makedirs(startup_dir, exist_ok=True)
with open(f'{startup_dir}/001_pytorch_fix.py', 'w') as f:
    f.write('import sys\nimport os\nsys.path.insert(0, "/app")\nimport torch_patch\nimport import_hook\n')
