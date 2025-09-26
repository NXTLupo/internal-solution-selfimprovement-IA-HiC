
# Add auto-import for the patch
import sys, os

# Create a path where we know Python will look for modules
os.makedirs('/app/pytorch_fix', exist_ok=True)
with open('/app/pytorch_fix/__init__.py', 'w') as f:
    f.write('# Force load patch\nfrom .. import torch_patch\n')

# Add the path to sys.path if not already there
if '/app' not in sys.path:
    sys.path.insert(0, '/app')
