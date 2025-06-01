import sys

# Source file with our emergency fix
template_path = '/app/templates/enhanced-index.html'
target_path = '/app/templates/index.html'

# Create backup of index.html before replacing
backup_path = '/app/templates/index.html.bak'

try:
    # Make backup of the original index.html
    with open(target_path, 'r') as src:
        with open(backup_path, 'w') as dest:
            dest.write(src.read())
    print(f'Created backup at {backup_path}')
    
    # Copy enhanced-index.html to index.html
    with open(template_path, 'r') as src:
        with open(target_path, 'w') as dest:
            dest.write(src.read())
    print(f'Successfully copied {template_path} to {target_path}')
    
    # Now modify app.py to always use index.html
    app_path = '/app/app.py'
    
    # Read app.py content
    with open(app_path, 'r') as f:
        content = f.read()
    
    # Replace enhanced template condition with always using index.html
    if 'cx_agent_enabled and' in content:
        updated_content = content.replace(
