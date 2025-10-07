#!/usr/bin/env python3
import os
import sys
import subprocess

# API key to use
API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Create a direct environment modification script
with open("env_fix.py", "w") as f:
    f.write(f"""#!/usr/bin/env python3
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

# API key
API_KEY = "{API_KEY}"
logger.info(f"Setting API key: {{API_KEY[:8]}}...{{API_KEY[-4:]}}")

# Apply to environment directly
os.environ["OPENAI_API_KEY"] = API_KEY
os.environ["USE_WHISPER_API"] = "true"

# Verify
logger.info(f"OPENAI_API_KEY in environment: {{os.environ.get('OPENAI_API_KEY', 'not set')[:8]}}...")
logger.info(f"USE_WHISPER_API in environment: {{os.environ.get('USE_WHISPER_API', 'not set')}}")

# Create a permanent .env file
with open("/app/.env", "w") as f:
    f.write(f"OPENAI_API_KEY={{API_KEY}}\\n")
    f.write("USE_WHISPER_API=true\\n")
logger.info("Created /app/.env file")

# Update app.py by inserting the key
import subprocess
subprocess.run([
    "sed", "-i", 
    "1i import os\\nos.environ['OPENAI_API_KEY'] = '{{}}' # Added by fix\\nos.environ['USE_WHISPER_API'] = 'true'".format(API_KEY),
    "/app/src/app.py"
])
logger.info("Updated app.py to set environment variables at startup")

# Update transcription modules
for module in [
    "/app/src/transcription/openai_whisper_api.py",
    "/app/src/transcription/robust_whisper_api.py"
]:
    if os.path.exists(module):
        subprocess.run([
            "sed", "-i", 
            "1i import os\\nos.environ['OPENAI_API_KEY'] = '{{}}' # Added by fix\\nos.environ['USE_WHISPER_API'] = 'true'".format(API_KEY),
            module
        ])
        logger.info(f"Updated {{module}} to set environment variables")

print("Environment variables and files have been updated successfully!")
""")

# Copy to container and execute
subprocess.run(["docker", "cp", "env_fix.py", "nxthumans_ai_cx_workbench-video-analyzer-1:/app/env_fix.py"], check=True)
os.remove("env_fix.py")

print("Running environment fix script in container...")
subprocess.run(["docker", "exec", "nxthumans_ai_cx_workbench-video-analyzer-1", "python", "/app/env_fix.py"], check=True)

# Create a direct environment script that will be used at startup
with open("set_env_at_startup.py", "w") as f:
    f.write(f"""#!/usr/bin/env python3
# This script must be imported at the start of the application
import os
import sys
import logging

# Force set environment variables
os.environ['OPENAI_API_KEY'] = '{API_KEY}'
os.environ['USE_WHISPER_API'] = 'true'

# Log that we've set the variables
logging.info(f"set_env_at_startup.py: Set OPENAI_API_KEY={os.environ.get('OPENAI_API_KEY', '')[:8]}...")
logging.info(f"set_env_at_startup.py: Set USE_WHISPER_API={os.environ.get('USE_WHISPER_API', '')}")
""")

# Copy to container
subprocess.run(["docker", "cp", "set_env_at_startup.py", "nxthumans_ai_cx_workbench-video-analyzer-1:/app/set_env_at_startup.py"], check=True)
os.remove("set_env_at_startup.py")

# Modify run.py to import set_env_at_startup.py
with open("fixed_run.py", "w") as f:
    f.write("""#!/usr/bin/env python3
import sys
import os

# Import environment setup FIRST
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import set_env_at_startup
except ImportError:
    print("Warning: set_env_at_startup.py not found")

import uvicorn
import os
import logging
import sys

# Manually set key again
os.environ['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY', '')
os.environ['USE_WHISPER_API'] = 'true'

# Create required directories
os.makedirs("logs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
os.makedirs("transcripts", exist_ok=True)
os.makedirs("temp", exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/video_analyzer.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("video-analyzer")
logger.info("Starting Video Analyzer service")
logger.info(f"OPENAI_API_KEY is set: {bool(os.environ.get('OPENAI_API_KEY', ''))}")
logger.info(f"USE_WHISPER_API is set: {os.environ.get('USE_WHISPER_API', 'not set')}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    logger.info(f"Starting server on port {port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
""")

# Copy to container
subprocess.run(["docker", "cp", "fixed_run.py", "nxthumans_ai_cx_workbench-video-analyzer-1:/app/run.py"], check=True)
os.remove("fixed_run.py")

# Restart the container
print("Restarting container...")
subprocess.run(["docker", "restart", "nxthumans_ai_cx_workbench-video-analyzer-1"], check=True)

print("✅ All fixes applied and container restarted")
print("\nThe OpenAI API key should now be correctly set in the Video Analyzer.")