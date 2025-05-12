import os
import re

def patch_app_py():
    # Only patch the main app.py file since that's where the issue is
    file_path = '/app/app.py'
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Create backup
    with open(f'{file_path}.bak', 'w') as f:
        f.write(content)
    
    # Fix 1: Change the initialize_conversation function
    # The issue is that the system message is being added as a message with role 'system'
    # Instead, we should keep it separately and pass it as the system parameter
    initialize_pattern = re.compile(r'(async def initialize_conversation.*?conversations\[conversation_id\] = Conversation\(\s*id=conversation_id,\s*messages=\[.*?Message\(role=["\'])system(["\'].*?\),\s*\],)', re.DOTALL)
    fixed_initialize = r'\1user\2'
    patched_content = re.sub(initialize_pattern, fixed_initialize, content)
    
    # Fix 2: Add system parameter to Claude API calls
    # Find all instances of anthropic_client.messages.create
    api_call_pattern = re.compile(r'(await anthropic_client\.messages\.create\(\s*model=.*?,\s*)(messages=.*?,\s*max_tokens=\d+\s*\))', re.DOTALL)
    fixed_api_call = r'\1system=system_message,\n        \2'
    patched_content = re.sub(api_call_pattern, fixed_api_call, patched_content)
    
    # Check if changes were made
    if content != patched_content:
        # Write patched content
        with open(file_path, 'w') as f:
            f.write(patched_content)
        
        print(f'✅ Successfully patched {file_path}')
        print('Changes made:')
        print('1. Changed system role to user role in messages')
        print('2. Added system parameter to Claude API calls')
        return True
    else:
        print('❓ No changes needed in {file_path}')
        return False

# Add function to make system message accessible throughout app
def add_global_system_message():
    file_path = '/app/app.py'
    
    with open(file_path, 'r') as f:
        content = f.readlines()
    
    # Find where the create_system_message function is defined
    for i, line in enumerate(content):
        if 'def create_system_message()' in line:
            create_system_line = i
            break
    else:
        print('❌ Could not find create_system_message function')
        return False
    
    # Find the end of the function
    for i in range(create_system_line, len(content)):
        if content[i].strip() == 'return system_prompt':
            end_line = i
            break
    else:
        print('❌ Could not find end of create_system_message function')
        return False
    
    # Add a line after the function to create a global variable
    modified_content = content[:]
    modified_content.insert(end_line + 2, '# Global system message\nsystem_message = create_system_message()\n')
    
    # Write the modified content
    with open(file_path, 'w') as f:
        f.writelines(modified_content)
    
    print('✅ Added global system_message variable')
    return True

# Main execution
print(🔄
