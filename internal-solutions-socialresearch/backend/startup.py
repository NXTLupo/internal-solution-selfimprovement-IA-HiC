#!/usr/bin/env python
"""
Startup script for the application.
This script performs all initialization tasks before Gunicorn starts.
"""

import os
import sys
import logging
import nltk
from dotenv import load_dotenv

# Add the current directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

# Set up basic logging for this script
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("startup")

def initialize_nltk():
    """Download required NLTK data."""
    logger.info("Downloading NLTK data...")
    try:
        nltk.download('punkt')
        logger.info("NLTK data downloaded successfully")
        return True
    except Exception as e:
        logger.error(f"Error downloading NLTK data: {str(e)}")
        return False

def initialize_database():
    """Initialize database tables."""
    logger.info("Initializing database...")
    try:
        # Import here to avoid circular imports
        from app.db_init import init_db
        init_db()
        logger.info("Database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return False

def initialize_pgvector():
    """Initialize PGVector tables."""
    logger.info("Initializing PGVector tables...")
    try:
        # Import here to avoid circular imports
        from util.llm_models.pgvector.pgvector import create_pgvector_tables
        create_pgvector_tables()
        logger.info("PGVector tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing PGVector tables: {str(e)}")
        return False

def create_temp_directory():
    """Create temp directory for analysis files."""
    logger.info("Creating temp directory...")
    try:
        temp_dir = os.getenv('SENTIMENT_LOG_DIR', '/app/temp')
        os.makedirs(temp_dir, exist_ok=True)
        logger.info(f"Temp directory created/verified at: {temp_dir}")
        return True
    except Exception as e:
        logger.error(f"Error creating temp directory: {str(e)}")
        return False

def main():
    """Main initialization function."""
    logger.info("Starting application initialization...")

    # Create temp directory first
    temp_success = create_temp_directory()

    # Initialize NLTK
    nltk_success = initialize_nltk()

    # Initialize database
    db_success = initialize_database()

    # Initialize PGVector
    pgvector_success = initialize_pgvector()

    # Check if all initializations were successful
    if temp_success and nltk_success and db_success and pgvector_success:
        logger.info("All initializations completed successfully!")
    else:
        logger.warning("Some initializations failed. Check the logs for details.")

    logger.info("Initialization complete. Starting Gunicorn server...")

if __name__ == "__main__":
    main() 