
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
