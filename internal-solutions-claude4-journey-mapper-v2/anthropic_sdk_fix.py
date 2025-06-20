#\!/usr/bin/env python3
import sys
import os
import pkg_resources

def patch_anthropic_sdk():
    """
    This script patches the Anthropic SDK to remove the proxies parameter that's causing issues.
    """
    try:
        anthropic_path = pkg_resources.resource_filename('anthropic', '')
        client_path = os.path.join(anthropic_path, '_base_client.py')
        
        print(f"Looking for Anthropic SDK at: {client_path}")
        
        if not os.path.exists(client_path):
            print("Cannot find Anthropic SDK _base_client.py file.")
            return False
        
        with open(client_path, 'r') as f:
            content = f.read()
        
        # Check if 'proxies' is in the file
        if 'proxies' not in content:
            print("No proxies parameter found in the SDK - nothing to patch.")
            return False
        
        # Create a backup
        backup_path = client_path + '.bak'
        with open(backup_path, 'w') as f:
            f.write(content)
        print(f"Created backup at {backup_path}")
        
        # Remove proxies parameter
        # This is a basic approach - depending on the SDK version, you might need more complex patching
        modified_content = content.replace(', proxies=None', '')
        modified_content = modified_content.replace('proxies=None, ', '')
        modified_content = modified_content.replace('proxies=None', '')
        
        with open(client_path, 'w') as f:
            f.write(modified_content)
        
        print("Successfully patched Anthropic SDK to remove proxies parameter.")
        return True
        
    except Exception as e:
        print(f"Error patching Anthropic SDK: {e}")
        return False

if __name__ == "__main__":
    success = patch_anthropic_sdk()
    sys.exit(0 if success else 1)
