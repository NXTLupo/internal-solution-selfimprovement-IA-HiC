#!/usr/bin/env python3
import os
import sys

# API key to use
API_KEY = "***REDACTED-OPENAI-KEY***"

# Directly modify the app.py file
app_py_path = os.path.join(os.path.dirname(__file__), "app.py")

if not os.path.exists(app_py_path):
    print(f"Error: {app_py_path} not found")
    sys.exit(1)

# Read the content of app.py
with open(app_py_path, "r") as f:
    lines = f.readlines()

# Modify the content
modified_lines = []
api_key_set = False

for line in lines:
    if "OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')" in line:
        # Replace with hardcoded API key
        modified_lines.append(f"OPENAI_API_KEY = '{API_KEY}'  # Hardcoded for testing\n")
        modified_lines.append("# Ensure environment variable is set for other modules\n")
        modified_lines.append(f"os.environ['OPENAI_API_KEY'] = OPENAI_API_KEY\n")
        modified_lines.append("os.environ['USE_WHISPER_API'] = 'true'\n")
        api_key_set = True
    else:
        modified_lines.append(line)

if not api_key_set:
    print("Error: Could not find the OPENAI_API_KEY line in app.py")
    sys.exit(1)

# Write the modified content back
with open(app_py_path, "w") as f:
    f.writelines(modified_lines)

print(f"Successfully updated {app_py_path} with hardcoded API key")

# Create a .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
with open(env_path, "w") as f:
    f.write(f"OPENAI_API_KEY={API_KEY}\n")
    f.write("USE_WHISPER_API=true\n")

print(f"Created .env file at {env_path}")

print("Done! The app should now use the OpenAI API key correctly.")