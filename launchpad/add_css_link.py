# Read the template file
with open('/app/templates/enhanced-index.html', 'r') as f:
    content = f.read()

# Check if chatbot.css is already in the head section
if '<link rel="stylesheet" href="/static/chatbot.css">' not in content:
    # Add the CSS link before the closing head tag
    content = content.replace('</head>', '  <link rel="stylesheet" href="/static/chatbot.css">\n</head>')
    print('Added chatbot.css link to head section')
else:
    print('chatbot.css link already present in head section')

# Write the updated content back to the file
with open('/app/templates/enhanced-index.html', 'w') as f:
    f.write(content)
