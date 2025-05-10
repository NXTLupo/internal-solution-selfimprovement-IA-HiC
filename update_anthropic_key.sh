#!/bin/bash

# This script updates the Anthropic API key in the Journey Mapper container

# The API key to set
API_KEY="***REDACTED-ANTHROPIC-KEY***"

# Update the environment variable in the container
docker exec nxthumans_ai_cx_workbench-journey-mapper-1 bash -c "echo \"ANTHROPIC_API_KEY=${API_KEY}\" > /app/.env"

# Make a Python script to update the application's environment at runtime
docker exec nxthumans_ai_cx_workbench-journey-mapper-1 bash -c "cat > /app/update_env.py << 'EOF'
#!/usr/bin/env python3
import os

# Set the API key
os.environ['ANTHROPIC_API_KEY'] = '***REDACTED-ANTHROPIC-KEY***'

# Print confirmation
print('Updated ANTHROPIC_API_KEY environment variable')
EOF"

# Make the script executable
docker exec nxthumans_ai_cx_workbench-journey-mapper-1 bash -c "chmod +x /app/update_env.py"

# Run the script in the container
docker exec nxthumans_ai_cx_workbench-journey-mapper-1 bash -c "python3 /app/update_env.py"

# Modify app startup to ensure the API key is set each time
docker exec nxthumans_ai_cx_workbench-journey-mapper-1 bash -c "if [ -f /app/run.py ]; then sed -i '1i import os; os.environ[\"ANTHROPIC_API_KEY\"] = \"***REDACTED-ANTHROPIC-KEY***\"' /app/run.py; fi"

# Restart the service to apply changes
docker restart nxthumans_ai_cx_workbench-journey-mapper-1

echo "API key updated and service restarted"