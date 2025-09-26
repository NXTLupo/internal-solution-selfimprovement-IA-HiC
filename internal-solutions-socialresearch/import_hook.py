
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
