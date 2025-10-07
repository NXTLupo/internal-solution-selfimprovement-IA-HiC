import os
import sys

# Get the correct API keys
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

# Create the file contents for each model
openai_fix = f"""
# Force set OpenAI API key
import os
import openai

# Set environment variable
os.environ["OPENAI_API_KEY"] = "{OPENAI_KEY}"
os.environ["CHATGPT5_API_KEY"] = "{OPENAI_KEY}"

# Directly set the API key on the module
openai.api_key = "{OPENAI_KEY}"
"""

anthropic_fix = f"""
# Force set Anthropic API key
import os

# Set environment variable
os.environ["ANTHROPIC_API_KEY"] = "{ANTHROPIC_KEY}"
os.environ["CLAUDE_API_KEY"] = "{ANTHROPIC_KEY}"
os.environ["CLAUDE4_API_KEY"] = "{ANTHROPIC_KEY}"
"""

gemini_fix = f"""
# Force set Gemini API key
import os
import google.generativeai as genai

# Set environment variable
os.environ["GEMINI_API_KEY"] = "{GEMINI_KEY}"

# Configure directly
genai.configure(api_key="{GEMINI_KEY}")
"""

# Write the files
with open("openai_fix.py", "w") as f:
    f.write(openai_fix)

with open("anthropic_fix.py", "w") as f:
    f.write(anthropic_fix)

with open("gemini_fix.py", "w") as f:
    f.write(gemini_fix)

# Create an init fix that loads all the modules
init_fix = """
# Import all the fixes
try:
    from . import openai_fix
    from . import anthropic_fix
    from . import gemini_fix
    print("All API key fixes applied")
except Exception as e:
    print(f"Error applying API key fixes: {e}")
"""

with open("api_fix_init.py", "w") as f:
    f.write(init_fix)

print("API fix files created successfully")