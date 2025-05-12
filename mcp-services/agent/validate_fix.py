#!/usr/bin/env python3
import os
import sys
import re

# Patterns to search for
good_patterns = [
    r'await\s+anthropic_client\.messages\.create\(\s*model=.*?,\s*system=',  # Checking for system parameter
    r'user",\s*content=system_message'  # System message should be role=user 
]

file_path = '/app/app.py'

with open(file_path, 'r') as f:
    content = f.read()

all_good = True
for pattern in good_patterns:
    if not re.search(pattern, content):
        print(f'❌ Fix validation failed: Pattern not found: {pattern}')
        all_good = False

if all_good:
    print('✅ Fix validation successful! All required changes are present.')
    sys.exit(0)
else:
    print('❌ Fix validation failed! Some required changes are missing.')
    sys.exit(1)
