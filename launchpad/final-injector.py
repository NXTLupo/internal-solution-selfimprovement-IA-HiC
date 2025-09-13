import sys

# Apply to both templates
for template_path in ['/app/templates/index.html', '/app/templates/enhanced-index.html']:
    try:
        # Read the template file
        with open(template_path, 'r') as f:
            content = f.read()
            
        # Read the script
        with open('/app/final-attempt.js', 'r') as f:
            script = f.read()
            
        # Make sure we don't inject duplicates
        if 'Emergency Chatbot Debug' in content:
            print(f'Debug panel already exists in {template_path}, removing...')
            # Start with a clean template
            # Simple but naive approach - just take the content up to the first debug panel
            if '<div id="debug-panel"' in content:
                content = content.split('<div id="debug-panel"')[0] + '</body></html>'
            if '<div id="main-debug-panel"' in content:
                content = content.split('<div id="main-debug-panel"')[0] + '</body></html>'
                
        # Create the full script tag with our code
        script_tag = f'\n<script>\n// Final Emergency Debug Panel\n{script}\n</script>\n'
        
        # Insert before closing body
        if '</body>' in content:
            updated_content = content.replace('</body>', script_tag + '</body>')
            
            # Write back
            with open(template_path, 'w') as f:
                f.write(updated_content)
            print(f'Successfully injected clean debug panel into {template_path}')
        else:
            print(f'Could not find </body> in {template_path}')
    except Exception as e:
        print(f'Error processing {template_path}: {str(e)}')

print('Debug panel injection complete\!')
