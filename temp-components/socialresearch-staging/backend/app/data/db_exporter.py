import os
import subprocess
from dotenv import load_dotenv
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file located at the workspace root
# Adjust the path '../../.env' if your .env file is located elsewhere relative to this script
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
    logger.info(f"Loaded environment variables from {dotenv_path}")
else:
    logger.warning(f".env file not found at {dotenv_path}. Attempting to use environment variables directly.")
    # Attempt to load from default location if specific path fails
    load_dotenv()


# --- Configuration ---
# Get database connection details from environment variables
DB_USER = os.getenv('POSTGRES_USER')
DB_PASSWORD = os.getenv('POSTGRES_PASSWORD')
DB_HOST = os.getenv('POSTGRES_HOST')
DB_PORT = os.getenv('POSTGRES_PORT', '5432') # Default PostgreSQL port
DB_NAME = os.getenv('POSTGRES_DB')

# Define the output directory and file path relative to this script's location
# Output will be in backend/app/data/llm_analyzer/data_dump.sql
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'llm_analyzer')
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'data_dump.sql')
# --- End Configuration ---


def check_db_connection_vars():
    """Check if all necessary database environment variables are set."""
    missing_vars = []
    if not DB_USER: missing_vars.append('POSTGRES_USER')
    # DB_PASSWORD might be optional depending on pg_dump auth method (e.g., .pgpass)
    # but we'll check it for clarity as we use it in the command
    if not DB_PASSWORD: logger.warning("POSTGRES_PASSWORD environment variable not set. pg_dump might require it or alternative authentication (e.g., .pgpass).")
    if not DB_HOST: missing_vars.append('POSTGRES_HOST')
    if not DB_PORT: missing_vars.append('POSTGRES_PORT')
    if not DB_NAME: missing_vars.append('POSTGRES_DB')

    if missing_vars:
        logger.error(f"Missing required database environment variables: {', '.join(missing_vars)}")
        return False
    return True

def export_database():
    """Exports the database data using pg_dump."""
    if not check_db_connection_vars():
        sys.exit("Exiting due to missing database connection variables.")

    # Ensure the output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    logger.info(f"Ensured output directory exists: {OUTPUT_DIR}")

    # Construct the pg_dump command
    # We use --data-only because SQLAlchemy manages the schema creation
    # Using '-w' to never prompt for password, relies on PGPASSWORD env var or .pgpass
    command = [
        'pg_dump',
        '--host', DB_HOST,
        '--port', str(DB_PORT),
        '--username', DB_USER,
        '--dbname', DB_NAME,
        '--data-only',   # Export only data, not schema
        '--no-owner',    # Do not output commands to set ownership
        '--no-privileges', # Do not output commands to set privileges
        '-w'             # Never prompt for password
    ]

    # Set the PGPASSWORD environment variable for the subprocess
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASSWORD

    logger.info(f"Starting database export to {OUTPUT_FILE}...")
    logger.info(f"Executing command: {' '.join(command)} (Password hidden)") # Don't log the full command with password visible if possible

    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            # Run the command
            process = subprocess.run(
                command,
                stdout=f, # Redirect stdout to the file
                stderr=subprocess.PIPE, # Capture stderr
                check=True, # Raise CalledProcessError on non-zero exit code
                env=env, # Pass the environment with PGPASSWORD
                text=True, # Decode stderr as text
                encoding='utf-8'
            )
        logger.info(f"Database export completed successfully to {OUTPUT_FILE}")

    except FileNotFoundError:
        logger.error("Error: 'pg_dump' command not found. Make sure PostgreSQL client tools are installed and in your system's PATH.")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        logger.error(f"Error during database export. Return code: {e.returncode}")
        logger.error(f"Command: {' '.join(e.cmd)}")
        logger.error(f"Stderr: {e.stderr}")
        # Clean up the potentially incomplete output file
        if os.path.exists(OUTPUT_FILE):
            os.remove(OUTPUT_FILE)
            logger.info(f"Removed potentially incomplete file: {OUTPUT_FILE}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}")
        # Clean up the potentially incomplete output file
        if os.path.exists(OUTPUT_FILE):
            os.remove(OUTPUT_FILE)
            logger.info(f"Removed potentially incomplete file: {OUTPUT_FILE}")
        sys.exit(1)

if __name__ == "__main__":
    export_database()