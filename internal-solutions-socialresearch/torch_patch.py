
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
