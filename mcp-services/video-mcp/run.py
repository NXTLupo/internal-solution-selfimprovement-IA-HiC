#!/usr/bin/env python3
import uvicorn
import os
import logging
import sys

# Create required directories
os.makedirs("logs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/video_mcp.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("video-mcp")
logger.info("Starting Video MCP service")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8504))
    logger.info(f"Starting server on port {port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)