"""
Configuration utility for wkhtmltopdf
This module detects the wkhtmltopdf installation and configures pdfkit to use it
"""

import os
import sys
import logging
import subprocess
from typing import Optional

logger = logging.getLogger(__name__)

def find_wkhtmltopdf_path() -> Optional[str]:
    """Find the wkhtmltopdf binary path on the system"""
    
    # Check common paths based on OS
    if sys.platform == 'win32':
        common_paths = [
            r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe',
            r'C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe',
        ]
    elif sys.platform == 'darwin':  # macOS
        common_paths = [
            '/usr/local/bin/wkhtmltopdf',
            '/opt/homebrew/bin/wkhtmltopdf',
            '/opt/local/bin/wkhtmltopdf',
        ]
    else:  # Linux/Unix
        common_paths = [
            '/usr/bin/wkhtmltopdf',
            '/usr/local/bin/wkhtmltopdf',
            '/opt/bin/wkhtmltopdf',
        ]
    
    # Check if any of the common paths exist
    for path in common_paths:
        if os.path.exists(path) and os.access(path, os.X_OK):
            logger.info(f"Found wkhtmltopdf at: {path}")
            return path
    
    # Try to find using the 'which' command (Unix-like) or 'where' (Windows)
    try:
        if sys.platform == 'win32':
            proc = subprocess.run(['where', 'wkhtmltopdf'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE,
                                 text=True,
                                 check=False)
        else:
            proc = subprocess.run(['which', 'wkhtmltopdf'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE,
                                 text=True,
                                 check=False)
            
        if proc.returncode == 0 and proc.stdout.strip():
            path = proc.stdout.strip().split('\n')[0]
            logger.info(f"Found wkhtmltopdf using system path: {path}")
            return path
            
    except Exception as e:
        logger.warning(f"Error searching for wkhtmltopdf using which/where: {str(e)}")
    
    logger.warning("Could not find wkhtmltopdf path")
    return None

def configure_pdfkit():
    """Configure pdfkit with the correct wkhtmltopdf path"""
    import pdfkit
    
    wkhtmltopdf_path = find_wkhtmltopdf_path()
    
    if wkhtmltopdf_path:
        config = pdfkit.configuration(wkhtmltopdf=wkhtmltopdf_path)
        logger.info(f"Configured pdfkit with wkhtmltopdf at: {wkhtmltopdf_path}")
        return config
    else:
        # No custom configuration, let pdfkit try to find the binary itself
        logger.warning("Using default pdfkit configuration as wkhtmltopdf path not found")
        return None

# Get the configuration when this module is imported
wkhtmltopdf_config = configure_pdfkit()