#!/usr/bin/env python3
"""
EMERGENCY FIX for 413 Content Too Large errors with Whisper API
This script directly monkey-patches the httpx library to enforce strict size limits
"""

import os
import sys
import logging
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('413-fix')

# Patch file to apply
MONKEY_PATCH_FILE = 'src/transcription/whisper_api_patch.py'

def create_monkey_patch():
    """Create a monkey patch file to enforce size limits"""
    
    patch_content = """
# Whisper API Patch to prevent 413 errors
# This file monkey-patches the httpx library to enforce strict size limits for the Whisper API

import logging
import os
import sys
import httpx
from typing import Any, Dict, List, Optional, Union, Tuple

logger = logging.getLogger('whisper-api-patch')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

# Store the original post method
original_post = httpx.AsyncClient.post

# Maximum file size in bytes (10MB to be extra safe)
MAX_SIZE_BYTES = 10 * 1024 * 1024

async def patched_post(self, 
                      url: str, 
                      *args: Any, 
                      **kwargs: Any) -> httpx.Response:
    '''
    Patched version of httpx.AsyncClient.post that enforces file size limits
    for Whisper API calls
    '''
    # Only intercept Whisper API calls
    if 'api.openai.com/v1/audio/transcriptions' in url:
        logger.info("Intercepting Whisper API call to enforce size limits")
        
        # Check if we have files in the request
        files = kwargs.get('files', {})
        if files:
            # Get the file object
            for key, file_tuple in files.items():
                if len(file_tuple) >= 2 and hasattr(file_tuple[1], 'seek') and hasattr(file_tuple[1], 'tell'):
                    file_obj = file_tuple[1]
                    
                    # Get file size
                    current_pos = file_obj.tell()
                    file_obj.seek(0, os.SEEK_END)
                    file_size = file_obj.tell()
                    file_obj.seek(current_pos)  # Restore position
                    
                    logger.info(f"File size: {file_size / 1024 / 1024:.2f}MB")
                    
                    # Check if file is too large
                    if file_size > MAX_SIZE_BYTES:
                        logger.error(f"File size ({file_size / 1024 / 1024:.2f}MB) exceeds limit ({MAX_SIZE_BYTES / 1024 / 1024:.2f}MB)")
                        
                        # Create a fake 413 response
                        error_json = {
                            "error": {
                                "message": f"INTERCEPTED: File size ({file_size / 1024 / 1024:.2f}MB) exceeds maximum size ({MAX_SIZE_BYTES / 1024 / 1024:.2f}MB)",
                                "type": "file_too_large",
                                "param": None,
                                "code": "file_too_large"
                            }
                        }
                        
                        # Return a fake response without making the API call
                        return httpx.Response(
                            status_code=413,
                            content=str(error_json).encode(),
                            request=httpx.Request("POST", url)
                        )
    
    # If not intercepted, call the original method
    return await original_post(self, url, *args, **kwargs)

# Apply the monkey patch
httpx.AsyncClient.post = patched_post
logger.info("Applied httpx monkey patch to enforce 10MB limit for Whisper API calls")
"""
    
    with open(MONKEY_PATCH_FILE, 'w') as f:
        f.write(patch_content.strip())
    
    logger.info(f"Created monkey patch file: {MONKEY_PATCH_FILE}")
    return True

def patch_openai_whisper_api():
    """Patch the enhanced_whisper_api.py file to use the monkey patch"""
    
    # Backup the file first
    api_file = 'src/transcription/enhanced_whisper_api.py'
    backup_file = f"{api_file}.bak.{int(os.path.getmtime(api_file))}"
    shutil.copy2(api_file, backup_file)
    logger.info(f"Backed up {api_file} to {backup_file}")
    
    # Read the file
    with open(api_file, 'r') as f:
        content = f.read()
    
    # Add the import at the top, after other imports
    import_patch = """
# Import the Whisper API patch to enforce size limits
try:
    from . import whisper_api_patch
    logger.info("Loaded Whisper API patch to enforce size limits")
except Exception as e:
    logger.error(f"Failed to load Whisper API patch: {e}")
"""
    
    # Find a good place to insert (after imports, before code)
    import_end = content.find("logger = logging.getLogger")
    if import_end == -1:
        import_end = content.find("OPENAI_API_KEY = get_openai_api_key()")
    
    if import_end == -1:
        logger.error("Could not find a suitable place to insert import")
        return False
    
    # Insert the import
    new_content = content[:import_end] + import_patch + content[import_end:]
    
    # Also update the max file size to be even safer
    new_content = new_content.replace("MAX_FILE_SIZE_MB = 15", "MAX_FILE_SIZE_MB = 10")
    
    # Write the file
    with open(api_file, 'w') as f:
        f.write(new_content)
    
    logger.info(f"Updated {api_file} to use monkey patch and reduced MAX_FILE_SIZE_MB to 10MB")
    return True

def main():
    """Main function"""
    logger.info("Starting emergency fix for 413 Content Too Large errors")
    
    # Create the monkey patch file
    if not create_monkey_patch():
        logger.error("Failed to create monkey patch file")
        return 1
    
    # Patch the enhanced_whisper_api.py file
    if not patch_openai_whisper_api():
        logger.error("Failed to patch enhanced_whisper_api.py")
        return 1
    
    logger.info("Successfully applied emergency fix for 413 Content Too Large errors")
    logger.info("The Whisper API now has a hard 10MB limit enforced at the HTTP client level")
    return 0

if __name__ == "__main__":
    sys.exit(main())