import sys

# Inject into both templates
for template_path in ["/app/templates/index.html", "/app/templates/enhanced-index.html"]:
    try:
        # Read template content
        with open(template_path, "r") as f:
            content = f.read()
            
        # Read debug panel
        with open("/app/inject-debug-panel.html", "r") as f:
            debug_panel = f.read()
            
        # Insert debug panel before body closing tag
        if "</body>" in content:
            updated_content = content.replace("</body>", debug_panel + "\n</body>")
            
            # Write updated content
            with open(template_path, "w") as f:
                f.write(updated_content)
                
            print(f"Debug panel injected into {template_path}")
        else:
            print(f"Error: Could not find </body> tag in {template_path}")
    except Exception as e:
        print(f"Error processing {template_path}: {str(e)}")
