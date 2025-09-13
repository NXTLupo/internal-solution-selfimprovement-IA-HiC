# Read the template file
with open('/app/templates/enhanced-index.html', 'r') as f:
    content = f.read()

# Read the debug panel HTML
with open('/app/templates/debug-chatbot.html', 'r') as f:
    debug_panel = f.read()

# Add the debug panel before the closing body tag
content = content.replace('</body>', debug_panel + '\n</body>')

# Write the updated content back to the file
with open('/app/templates/enhanced-index.html', 'w') as f:
    f.write(content)

print('Debug panel added to enhanced-index.html')
