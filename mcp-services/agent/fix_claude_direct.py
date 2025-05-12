#!/usr/bin/env python3
import re

# Backup the original file
with open('/app/app.py', 'r') as f:
    original_content = f.read()

with open('/app/app.py.bak.direct', 'w') as f:
    f.write(original_content)

print('Created backup at /app/app.py.bak.direct')

# Add global system message before initialize_conversation function
initialize_pattern = re.compile(r'(# Initialize a conversation\nasync def initialize_conversation)')
global_var_addition = '# Global system message for use in API calls\nsystem_message = create_system_message()\n\n\1'
modified_content = re.sub(initialize_pattern, global_var_addition, original_content)

# Fix the initialize_conversation function to remove system role message
role_system_pattern = re.compile(r'(conversations\[conversation_id\] = Conversation\(\s*id=conversation_id,\s*messages=\[\s*Message\(role=")system(".*?\),\s*\],)', re.DOTALL)
if 'role=system' in modified_content:
    modified_content = re.sub(role_system_pattern, '\1user\2', modified_content)
    print('Fixed system role in messages')
else:
    role_system_pattern_alt = re.compile(r'(conversations\[conversation_id\] = Conversation\(\s*id=conversation_id,\s*messages=\[\s*Message\(role=\')system(\'.*?\),\s*\],)', re.DOTALL)
    modified_content = re.sub(role_system_pattern_alt, '\1user\2', modified_content)
    print('Fixed alternate system role in messages')

# Better yet, just remove the message entirely
empty_messages_pattern = re.compile(r'(conversations\[conversation_id\] = Conversation\(\s*id=conversation_id,\s*)messages=\[\s*Message\(role=["\']system["\'].*?\),\s*\],', re.DOTALL)
modified_content = re.sub(empty_messages_pattern, '\1messages=[],', modified_content)
print('Removed system message from initialization')

# Add system parameter to Claude API calls
api_call_pattern = re.compile(r'(await anthropic_client\.messages\.create\(\s*model=.*?,\s*)(messages=.*?,\s*max_tokens=\d+\s*\))', re.DOTALL)
fixed_api_call = '\1system=system_message,\n        \2'
modified_content = re.sub(api_call_pattern, fixed_api_call, modified_content)
print('Added system parameter to Claude API calls')

# Write the modified content back
with open('/app/app.py', 'w') as f:
    f.write(modified_content)

print('Successfully fixed Claude API format issues in app.py')
