# Amazon Market Intelligence LLM Integration Fix

This document provides solutions for fixing the missing dependencies in the Amazon Market Intelligence container. The application requires certain Python packages for LLM integration (`anthropic`, `google-generativeai`, `openai`, and `python-dotenv`), which need to be installed in the Docker container.

## Quick Fix Options

Choose one of these quick fix options:

### Option 1: Direct Installation Script (Recommended)

Run the `install_amazon_dependencies.bat` script to automatically:
1. Find the running Amazon Market Intelligence container
2. Install the required packages
3. Restart the container

```
install_amazon_dependencies.bat
```

### Option 2: Manual Docker Commands

If you prefer to run commands directly:

```bash
# Find the container ID
docker ps | grep scrapehero-amazon

# Install dependencies (replace CONTAINER_ID with your actual container ID)
docker exec CONTAINER_ID pip install anthropic google-generativeai openai python-dotenv

# Restart the container
docker restart CONTAINER_ID
```

### Option 3: Python Fix Script

For a more interactive approach, you can run:

```
python fix_amazon_container.py
```

This script will find the container, install the dependencies, and restart it with user prompts.

### Option 4: Fallback App.py (If all else fails)

If the above methods don't work, you can replace the `app.py` with the fallback version:

1. Copy `fallback_app.py` to `app.py` in the container:
   ```bash
   docker cp internal-solutions-scrapehero-amazon/fallback_app.py CONTAINER_ID:/app/app.py
   ```
2. Restart the container:
   ```bash
   docker restart CONTAINER_ID
   ```

The fallback app gracefully handles missing dependencies by providing informative error messages instead of crashing.

## Permanent Fix (For Future Deployments)

For a permanent fix, we've updated:

1. The `requirements.txt` file to include all necessary dependencies
2. The `Dockerfile` with proper dependency installation
3. The `docker-compose.yml` file to pass through API keys
4. The Docker container setup in `docker-compose-all.yml`

On your next deployment, these changes will ensure the application starts with all dependencies installed.

## Verification

To verify the fix worked:

1. Open http://localhost:5008 (or your configured port)
2. Perform a search for any product category
3. Scroll down to the "AI Analysis & Chat" section
4. Click "Analyze Results" button
5. If you see an analysis generated, the fix was successful!

If you encounter any issues, check the container logs:

```bash
docker logs nxt-humans_ai_cx_workbench-scrapehero-amazon-1
```

## Contact

If you need further assistance, please reach out to the NXT HUMANS Intelligence Augmentation team.