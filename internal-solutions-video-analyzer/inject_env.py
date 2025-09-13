#!/usr/bin/env python3
import os

# Force set the environment variables
os.environ['OPENAI_API_KEY'] = '***REDACTED-OPENAI-KEY***'
os.environ['USE_WHISPER_API'] = 'true'

# Update the app.py file to hardcode the API key
app_py_path = '/app/src/app.py'

with open(app_py_path, 'r') as f:
    content = f.read()

# Modify the file to hardcode the API key at the top
modified_content = content.replace(
    "# OpenAI API key (should be set as environment variable in production)",
    "# OpenAI API key (should be set as environment variable in production)\nOPENAI_API_KEY = '***REDACTED-OPENAI-KEY***'\n\n# Force set API key in environment as well for compatibility with other modules\nos.environ['OPENAI_API_KEY'] = OPENAI_API_KEY\nos.environ['USE_WHISPER_API'] = 'true'"
)

# Write the modified content back
with open(app_py_path, 'w') as f:
    f.write(modified_content)

print("Successfully updated app.py with hardcoded API key")
