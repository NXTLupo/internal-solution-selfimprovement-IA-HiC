import sys

# Apply to both templates
for template_path in ['/app/templates/index.html', '/app/templates/enhanced-index.html']:
    try:
        # Read the template file
        with open(template_path, 'r') as f:
            content = f.read()
            
        # Read the emergency script
        with open('/app/check-chatbot.js', 'r') as f:
            script = f.read()
            
        # Create the full script tag with our code
        script_tag = f'<script src="/static/chatbot.js"></script>'
        emergency_script_tag = f'\n<script>\n// Emergency fix script\n{script}\n</script>\n'
        
        # Make sure we're loading the chatbot.js script first
        if '<script src="/static/chatbot.js"></script>' not in content:
            # Add the chatbot.js script before enhanced-animations.js
            if '<script src="/static/enhanced-animations.js"></script>' in content:
                content = content.replace('<script src="/static/enhanced-animations.js"></script>', 
                                         f'{script_tag}\n  <script src="/static/enhanced-animations.js"></script>')
            else:
                # If we can't find enhanced-animations.js, just add before closing body
                content = content.replace('</body>', f'{script_tag}\n</body>')
        
        # Insert emergency script before closing body
        content = content.replace('</body>', f'{emergency_script_tag}</body>')
            
        # Write back
        with open(template_path, 'w') as f:
            f.write(content)
        print(f'Successfully injected emergency fix into {template_path}')
    except Exception as e:
        print(f'Error processing {template_path}: {str(e)}')

print('Emergency fix injection complete\!')
