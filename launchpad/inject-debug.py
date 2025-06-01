import sys

# Path to the template file
template_path = "/app/templates/enhanced-index.html"
debug_panel_path = "/app/debug-panel.html"

# Read the template file
with open(template_path, "r") as f:
    template_content = f.read()

# Read the debug panel file
with open(debug_panel_path, "r") as f:
    debug_panel = f.read()

# Insert the debug panel before the closing body tag
if "</body>" in template_content:
    updated_content = template_content.replace("</body>", f"{debug_panel}\n</body>")
    
    # Write the updated content back to the file
    with open(template_path, "w") as f:
        f.write(updated_content)
    
    print("Debug panel inserted successfully!")
else:
    print("Error: Could not find </body> tag in the template.")
    sys.exit(1)