import os
from flask import Flask, render_template, redirect, url_for, jsonify, request, Response

# Check if the enhanced-index.html exists
enhanced_template_path = "/app/templates/enhanced-index.html"
if os.path.exists(enhanced_template_path):
    print(f"Enhanced template exists at {enhanced_template_path}")
else:
    print(f"ERROR: Enhanced template not found at {enhanced_template_path}")

# Force set the environment variable
os.environ["ENABLE_CX_AGENT"] = "true"
print(f"ENABLE_CX_AGENT is now set to: {os.environ.get(ENABLE_CX_AGENT)}")

# Check if chatbot.js and chatbot.css exist
chatbot_js_path = "/app/static/chatbot.js"
chatbot_css_path = "/app/static/chatbot.css"

if os.path.exists(chatbot_js_path):
    print(f"Chatbot JS exists at {chatbot_js_path}")
else:
    print(f"ERROR: Chatbot JS not found at {chatbot_js_path}")

if os.path.exists(chatbot_css_path):
    print(f"Chatbot CSS exists at {chatbot_css_path}")
else:
    print(f"ERROR: Chatbot CSS not found at {chatbot_css_path}")

print("Fix complete!")
