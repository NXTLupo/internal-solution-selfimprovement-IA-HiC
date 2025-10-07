import os

# FORCE the correct OpenAI API key - override any environment variable
os.environ['OPENAI_API_KEY'] = "***REDACTED-OPENAI-KEY***"

print(f"[FORCED] OpenAI API key set to correct value ending in: {os.environ['OPENAI_API_KEY'][-4:]}")