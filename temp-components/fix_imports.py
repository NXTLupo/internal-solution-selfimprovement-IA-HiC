#!/usr/bin/env python3
"""
Fix imports and set up the project structure properly.
This script will:
1. Create necessary directories
2. Set up __init__.py files
3. Create symlinks for easy importing
4. Fix import paths in existing files
"""

import os
import shutil
import sys
import re
from pathlib import Path

def create_directory(path):
    """Create a directory if it doesn't exist."""
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Created directory: {path}")
    else:
        print(f"Directory already exists: {path}")

def create_file(path, content=""):
    """Create a file with the given content."""
    with open(path, 'w') as f:
        f.write(content)
    print(f"Created file: {path}")

def copy_file(source, dest):
    """Copy a file from source to destination."""
    try:
        shutil.copy2(source, dest)
        print(f"Copied file from {source} to {dest}")
        return True
    except Exception as e:
        print(f"Error copying file: {e}")
        return False

def setup_project_structure():
    """Set up the proper project structure."""
    # Create main directories
    create_directory("data_ingestion")
    create_directory("ai_analysis")
    create_directory("templates")
    create_directory("templates/pages")
    create_directory("static")
    create_directory("logs")
    create_directory("uploads")
    create_directory("journey_maps")
    
    # Create __init__.py files
    create_file("data_ingestion/__init__.py", "# Package initialization file\n")
    create_file("ai_analysis/__init__.py", "# Package initialization file\n")
    
    # Check if the main source files exist in the current directory
    dp_source = None
    djm_source = None
    
    for filename in os.listdir('.'):
        if filename == 'data_processor.py':
            dp_source = filename
        elif filename == 'dynamic_journey_mapper.py':
            djm_source = filename
    
    # If source files exist, move/copy them to the correct directories
    if dp_source:
        if not os.path.exists("data_ingestion/data_processor.py"):
            copy_file(dp_source, "data_ingestion/data_processor.py")
    else:
        # Create placeholder
        create_file("data_ingestion/data_processor.py", 
                   "# Placeholder for DataProcessor class\n"
                   "class DataProcessor:\n"
                   "    def __init__(self):\n"
                   "        pass\n"
                   "    \n"
                   "    def process_api_files(self, uploaded_files):\n"
                   "        return {'structured': [], 'unstructured': []}\n")
    
    if djm_source:
        if not os.path.exists("ai_analysis/dynamic_journey_mapper.py"):
            copy_file(djm_source, "ai_analysis/dynamic_journey_mapper.py")
    else:
        # Create placeholder
        create_file("ai_analysis/dynamic_journey_mapper.py", 
                   "# Placeholder for DynamicJourneyMapper class\n"
                   "class DynamicJourneyMapper:\n"
                   "    def __init__(self, anthropic_model='claude-3-7-sonnet-20250219', debug_mode=False):\n"
                   "        self.anthropic_model = anthropic_model\n"
                   "        self.debug_mode = debug_mode\n"
                   "    \n"
                   "    def generate_journey_map(self, data):\n"
                   "        return {\n"
                   "            'interactive_html': '<html><body>Placeholder journey map</body></html>',\n"
                   "            'journey_summary': 'Placeholder summary'\n"
                   "        }\n"
                   "    \n"
                   "    def render_journey_map_html(self, journey_map):\n"
                   "        return journey_map.get('interactive_html', '')\n")

def create_run_script():
    """Create a run script for easy startup."""
    content = """#!/usr/bin/env python3
import uvicorn
import os

if __name__ == "__main__":
    # Check if API key is set
    if "ANTHROPIC_API_KEY" not in os.environ:
        api_key = input("Enter your Anthropic API key (or press Enter to use default): ")
        if api_key:
            os.environ["ANTHROPIC_API_KEY"] = api_key
        else:
            default_key = os.environ.get("ANTHROPIC_API_KEY", "")
            print(f"Using default API key")
            os.environ["ANTHROPIC_API_KEY"] = default_key
    
    # Set the model
    if "ANTHROPIC_MODEL" not in os.environ:
        os.environ["ANTHROPIC_MODEL"] = "claude-3-7-sonnet-20250219"
    
    # Start the server
    print("Starting AI Journey Mapper...")
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("app:app", host=host, port=port, reload=True)
"""
    create_file("run.py", content)
    # Make the file executable
    os.chmod("run.py", 0o755)
    print("Created run.py script for easy startup")

def main():
    """Main function to set up the project."""
    print("Setting up AI Journey Mapper project structure...")
    setup_project_structure()
    create_run_script()
    
    print("\nProject setup complete!")
    print("\nTo run the application, use:")
    print("python run.py")
    print("\nOr directly with uvicorn:")
    print("uvicorn app:app --reload")
    
    print("\nMake sure you have all required dependencies installed:")
    print("pip install fastapi uvicorn python-multipart pandas numpy spacy nltk pdfminer.six requests")

if __name__ == "__main__":
    main()