from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import json
import traceback
from datetime import datetime
import shutil
import uuid
import sys
import os
import re
import subprocess  # Import missing subprocess module
import requests
import pdfkit  # For server-side PDF generation

# Import wkhtmltopdf configuration
try:
    from wkhtmltopdf_config import wkhtmltopdf_config
except ImportError:
    try:
        from src.wkhtmltopdf_config import wkhtmltopdf_config
    except ImportError:
        wkhtmltopdf_config = None
        logging.warning("wkhtmltopdf configuration module not found, using default config")

# Set the correct API key
try:
    # First, try to load from our .env file
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed, trying to find API key in other ways")

# Try to load from parent directory's .env file if we don't have a key yet
if not os.environ.get("OPENAI_API_KEY"):
    try:
        parent_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', '.env')
        if os.path.exists(parent_env_path):
            print(f"Looking for API key in parent directory .env file: {parent_env_path}")
            with open(parent_env_path, 'r') as f:
                for line in f:
                    if line.strip().startswith('OPENAI_API_KEY='):
                        key = line.strip().split('=', 1)[1]
                        if key:
                            os.environ["OPENAI_API_KEY"] = key
                            print("Found and set OpenAI API key from parent directory's .env file")
    except Exception as e:
        print(f"Error reading parent .env file: {e}")

# Check if we have an API key after all attempts
if not os.environ.get("OPENAI_API_KEY"):
    print("\nERROR: No OpenAI API key found. The application will not function correctly.")
    print("Please set the OPENAI_API_KEY environment variable or provide it in a .env file.")
else:
    # Verify OpenAI API key before continuing
    try:
        import openai
        from openai import OpenAI
        client = OpenAI()
        
        # Check if we can make a simple API call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        print("\nOpenAI API key verification successful.")
        
        # Set model to use (either o3 or a fallback)
        if not os.environ.get("OPENAI_MODEL"):
            os.environ["OPENAI_MODEL"] = "o3"
            
        # Set reasoning effort if not specified
        if not os.environ.get("REASONING_EFFORT"):
            os.environ["REASONING_EFFORT"] = "medium"
            
    except Exception as e:
        print(f"\nWARNING: Could not verify OpenAI API key: {str(e)}")
        print("The application may not function correctly without a valid API key.")


# Import our custom components
# Ensure we can import our modules regardless of how the application is run
import sys
import os

# Add the project root directory to the Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from src.data_ingestion.data_processor import DataProcessor
    from src.ai_analysis.dynamic_journey_mapper import DynamicJourneyMapper
    from src.utils import logger
    print("Successfully imported from src package")
except ImportError as e:
    print(f"Import error from src package: {e}")
    try:
        # Try relative imports
        from .data_ingestion.data_processor import DataProcessor
        from .ai_analysis.dynamic_journey_mapper import DynamicJourneyMapper
        from .utils import logger
        print("Successfully imported using relative imports")
    except ImportError as e:
        print(f"Relative import error: {e}")
        try:
            # Last resort: direct imports (assuming we're in the correct directory)
            from data_ingestion.data_processor import DataProcessor
            from ai_analysis.dynamic_journey_mapper import DynamicJourneyMapper
            import logging as logger
            print("Successfully imported using direct imports")
        except ImportError as e:
            print(f"CRITICAL IMPORT ERROR: {e}")
            print("Using dummy implementations to prevent crash")
            import logging as logger
            
            # Create dummy class for DataProcessor
            class DataProcessor:
                def process_api_files(self, *args, **kwargs):
                    return {"metadata": {"context": {"title": "Error", "description": "Import error"}}, "unstructured": []}
            
            # We still need DynamicJourneyMapper, so try one more approach
            sys.path.append(os.path.join(project_root, 'src'))
            from ai_analysis.dynamic_journey_mapper import DynamicJourneyMapper

# Configure logging
if hasattr(logger, 'setup_logger'):
    logger.setup_logger()  # type: ignore
log = logging.getLogger(__name__)

# Create the FastAPI app object
app = FastAPI(
    title="AI Journey Mapper (OpenAI o3)",
    description="Upload data to generate interactive journey maps with OpenAI's o3 reasoning model",
    version="1.0.0"
)

# We'll validate the OpenAI API key in the route handlers

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setting o3 as the default model with fallback to GPT-4o
DEFAULT_OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "o3")

data_processor = DataProcessor()

def get_available_models() -> List[str]:
    """
    Return a list of available OpenAI models
    """
    return [
        "o3",              # OpenAI's specialized reasoning model
        "gpt-4o",         # GPT-4 Omni model
        "gpt-4-turbo",    # GPT-4 Turbo model
        "gpt-4"           # Standard GPT-4 model
    ]

@app.get("/", response_class=HTMLResponse)
async def get_home():
    """
    Serves a simple HTML form if the 'templates/pages/index.html' is not found.
    Otherwise, returns the content of that HTML file.
    If the API key is invalid, shows an error page.
    """
    # Check if OpenAI API key is valid, and show error page if not
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    openai_key_valid = False
    
    if openai_api_key:
        try:
            import openai
            from openai import OpenAI
            client = OpenAI()
            
            # Check if we can make a simple API call
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            openai_key_valid = True
            log.info("OpenAI API key verification successful")
        except Exception as e:
            log.error(f"OpenAI API key validation failed: {str(e)}")
            openai_key_valid = False
    
    # Show error page if OpenAI API key is missing or invalid
    if not openai_api_key or not openai_key_valid:
        try:
            error_path = "templates/api_key_error.html"
            with open(error_path, "r") as f:
                error_html = f.read()
                return HTMLResponse(content=error_html)
        except FileNotFoundError:
            # If error template is missing, return a simple error message
            return HTMLResponse(
                content="<h1>API Key Error</h1><p>Invalid or missing OpenAI API key. Please set a valid API key.</p>"
            )
    
    # Legacy check removed - we only need to check the OpenAI API key
            # If error template is missing, return a simple error message
            return HTMLResponse(
                content="<h1>API Key Error</h1><p>Invalid or missing OpenAI API key. Please set a valid API key.</p>"
            )
    
    # Normal operation if API keys are valid
    try:
        # Check both relative paths for the index.html file
        # First try pages subdirectory
        file_path = "templates/pages/index.html"
        if not os.path.exists(file_path):
            # Fall back to the root templates directory
            file_path = "templates/index.html"
            
        with open(file_path, "r") as f:
            html_content = f.read()
            return HTMLResponse(content=html_content)
    except FileNotFoundError:
        available_models = get_available_models()
        models_options_html = ""
        for model in available_models:
            selected = "selected" if model == DEFAULT_OPENAI_MODEL else ""
            models_options_html += f'<option value="{model}" {selected}>{model}</option>'
        if not models_options_html:
            models_options_html = f'<option value="{DEFAULT_OPENAI_MODEL}">{DEFAULT_OPENAI_MODEL}</option>'
            
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AI Journey Mapper with Claude 3.7</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }}
    h1 {{
      color: #4264D0;
      margin-bottom: 10px;
    }}
    .container {{
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 30px;
      margin-top: 20px;
    }}
    .form-group {{
      margin-bottom: 20px;
    }}
    label {{
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
    }}
    input[type="text"], textarea, select {{
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }}
    textarea {{
      height: 100px;
    }}
    .file-input {{
      border: 2px dashed #ddd;
      padding: 20px;
      text-align: center;
      border-radius: 4px;
      margin-bottom: 10px;
    }}
    .file-input:hover {{
      border-color: #4264D0;
    }}
    .submit-button {{
      background-color: #4264D0;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s;
    }}
    .submit-button:hover {{
      background-color: #3450A0;
    }}
    .file-list {{
      list-style: none;
      padding: 0;
    }}
    .file-list li {{
      padding: 5px;
      border-bottom: 1px solid #eee;
    }}
    .model-info {{
      margin-top: 10px;
      font-size: 0.9em;
      color: #666;
    }}
    .refresh-button {{
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 14px;
      cursor: pointer;
      margin-left: 10px;
      transition: background-color 0.3s;
    }}
    .refresh-button:hover {{
      background-color: #e0e0e0;
    }}
    .model-selection {{
      display: flex;
      align-items: center;
    }}
    #model-status {{
      margin-top: 5px;
      font-size: 0.85em;
      color: #888;
    }}
    .loading {{
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #4264D0;
      animation: spin 1s ease-in-out infinite;
      margin-left: 10px;
      vertical-align: middle;
    }}
    @keyframes spin {{
      to {{ transform: rotate(360deg); }}
    }}
    .highlight {{
      background-color: #f0f4ff;
      border: 1px solid #d0d4ff; 
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <h1>AI Journey Mapper with OpenAI o3</h1>
    <div class="highlight">
      <p>Using OpenAI's specialized o3 reasoning model for detailed journey analysis and visualization.</p>
    </div>
    
    <form action="/api/analyze" method="post" enctype="multipart/form-data" id="journey-form">
      <div class="form-group">
        <label for="title">Journey Title (optional)</label>
        <input type="text" id="title" name="title" placeholder="Customer Journey Map">
      </div>
      
      <div class="form-group">
        <label for="description">Description (optional)</label>
        <textarea id="description" name="description" placeholder="Brief description of this journey..."></textarea>
      </div>
      
      <div class="form-group">
        <label for="llm_model">AI Model</label>
        <div class="model-selection">
          <select id="llm_model" name="llm_model">
            {models_options_html}
          </select>
          <button type="button" class="refresh-button" id="refresh-models">Refresh Models</button>
        </div>
        <div id="model-status">Using OpenAI's o3 reasoning model</div>
      </div>
      
      <div class="form-group">
        <label for="files">Upload Files</label>
        <div class="file-input">
          <input type="file" id="files" name="files" multiple>
          <p id="file-label">Drag files here or click to upload (CSV, TXT, PDF, JSON)</p>
        </div>
      </div>
      
      <button type="submit" class="submit-button" id="submit-button">Generate Journey Map</button>
    </form>
  </div>
  
  <script>
    document.getElementById('files').addEventListener('change', function() {{
      const fileLabel = document.getElementById('file-label');
      if (this.files.length > 0) {{
        if (this.files.length === 1) {{
          fileLabel.textContent = `Selected: ${{this.files[0].name}}`;
        }} else {{
          fileLabel.textContent = `Selected ${{this.files.length}} files`;
        }}
      }} else {{
        fileLabel.textContent = 'Drag files here or click to upload (CSV, TXT, PDF, JSON)';
      }}
    }});

    document.getElementById('refresh-models').addEventListener('click', function() {{
      const button = this;
      const statusElement = document.getElementById('model-status');
      const modelSelect = document.getElementById('llm_model');
      
      button.disabled = true;
      statusElement.innerHTML = 'Loading models... <div class="loading"></div>';
      
      fetch('/api/models')
        .then(response => response.json())
        .then(data => {{
          modelSelect.innerHTML = '';
          
          if (data.models && data.models.length > 0) {{
            data.models.forEach(model => {{
              const option = document.createElement('option');
              option.value = model;
              option.textContent = model;
              modelSelect.appendChild(option);
            }});
            statusElement.textContent = `Found ${{data.models.length}} available models`;
          }} else {{
            const option = document.createElement('option');
            option.value = "{DEFAULT_OPENAI_MODEL}";
            option.textContent = "{DEFAULT_OPENAI_MODEL}";
            modelSelect.appendChild(option);
            statusElement.textContent = 'No models found. Using default model.';
          }}
        }})
        .catch(error => {{
          console.error('Error refreshing models:', error);
          statusElement.textContent = 'Failed to refresh models. Please try again.';
        }})
        .finally(() => {{
          button.disabled = false;
        }});
    }});

    document.getElementById('journey-form').addEventListener('submit', function(event) {{
      const files = document.getElementById('files').files;
      if (files.length === 0) {{
        event.preventDefault();
        alert('Please select at least one file to upload');
      }} else {{
        const submitButton = document.getElementById('submit-button');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing... This may take a few minutes';
      }}
    }});
  </script>
</body>
</html>"""
        return HTMLResponse(content=html_content)

@app.get("/api/models")
async def get_models():
    """
    Return the list of OpenAI-based models for the frontend to display.
    """
    models = get_available_models()
    return {"models": models, "default": DEFAULT_OPENAI_MODEL}

@app.get("/api/check-key")
async def check_api_key():
    """
    Endpoint to check if the OpenAI API key is valid.
    """
    try:
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            return {"valid": False, "error": "API key not set"}
            
        # Use the OpenAI client for key checking
        import openai
        from openai import OpenAI
        client = OpenAI()
        
        # Check if we can make a simple API call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        
        # If we get here, the key is valid
        return {"valid": True}
    except requests.exceptions.SSLError as ssl_err:
        log.warning(f"SSL error during API key check (not critical): {str(ssl_err)}")
        # Consider key valid but warn about SSL issues
        return {
            "valid": True,
            "warning": "SSL connection issue detected. API operations should work but might require retries."
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}

class JourneyRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    journey_type: Optional[str] = None
    llm_model: Optional[str] = None

class JourneyResponse(BaseModel):
    journey_id: str
    title: str
    html_url: str
    mermaid_code: str = ""
    diagram_type: str
    model_used: str
    journey_summary: str = ""

@app.post("/api/analyze")
async def analyze_files(
    files: List[UploadFile] = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    journey_type: Optional[str] = Form(None),
    llm_model: Optional[str] = Form(None)
):
    """
    Main endpoint for file uploads. Saves the files, processes them, then uses DynamicJourneyMapper to generate an HTML-based journey map.
    """
    log.info(f"Received {len(files)} files for analysis")
    journey_id = str(uuid.uuid4())
    
    model_to_use = llm_model if llm_model else os.getenv("OPENAI_MODEL", "o3")
    log.info(f"Using model: {model_to_use}")
    
    # Import vector store if available
    try:
        from src.utils.vector_store import init_vector_store
        use_rag = True
        log.info("Vector store module found, enabling RAG capabilities")
    except ImportError:
        use_rag = False
        log.info("Vector store module not found, disabling RAG capabilities")
    
    custom_journey_mapper = DynamicJourneyMapper(
        openai_model=model_to_use, 
        debug_mode=True,
        use_rag=use_rag
    )
    
    try:
        journey_dir = os.path.join("uploads", journey_id)
        os.makedirs(journey_dir, exist_ok=True)
        
        for file in files:
            if file.filename:
                file_path = os.path.join(journey_dir, file.filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                log.info(f"Saved file: {file_path}")
        
        log.info("Processing files...")
        processed_data = data_processor.process_api_files(files)
        
        if title or description or journey_type:
            processed_data["context"] = { # type: ignore
                "title": title or "",
                "description": description or "",
                "journey_type": journey_type or ""
            }
        
        processed_data_path = os.path.join(journey_dir, "processed_data.json")
        with open(processed_data_path, "w") as f:
            json.dump(processed_data, f, indent=2)
        
        log.info(f"Generating HTML/JavaScript interactive journey map with {model_to_use}...")
        journey_map = custom_journey_mapper.generate_journey_map(processed_data)
        
        html_content_path = os.path.join(journey_dir, "journey_html.txt")
        with open(html_content_path, "w", encoding="utf-8") as f:
            f.write(journey_map.get("interactive_html", ""))
        
        summary_path = os.path.join(journey_dir, "journey_summary.txt")
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write(journey_map.get("journey_summary", "No summary available"))
        
        log.info("Retrieving interactive HTML visualization...")
        journey_html = custom_journey_mapper.render_journey_map_html(journey_map)
        
        summary_html = ""
        if "journey_summary" in journey_map and journey_map["journey_summary"]:
            # Create summary HTML safely without using f-strings for content that might contain formatting characters
            summary_content = journey_map["journey_summary"]
            summary_html = """<div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4264D0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #4264D0; margin-top: 0; font-size: 1.4rem;">Journey Analysis Summary</h2>
    <div style="white-space: pre-line; font-size: 0.95rem; line-height: 1.6;">""" + summary_content + """</div>
</div>
"""
        
        # Create model display without any potentially problematic format strings
        model_display = f"OpenAI {model_to_use}" if model_to_use else "OpenAI model"
        date_display = datetime.now().strftime('%Y-%m-%d')
        
        model_info_html = """<div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0.8em; color: #666;">
  Generated with <strong>""" + model_display + """</strong> on """ + date_display + """</div>
"""
        
        # Insert summary_html after <body>
        if "<body>" in journey_html:
            body_pos = journey_html.find("<body>") + len("<body>")
            journey_html = journey_html[:body_pos] + summary_html + journey_html[body_pos:]
            
        # Create export functionality HTML
        export_script_html = """
<script src="/static/journey_export.js"></script>
"""
        
        # Insert model_info_html and export functionality before </body>
        if "</body>" in journey_html:
            journey_html = journey_html.replace("</body>", f"{model_info_html}{export_script_html}</body>")
        
        html_filename = f"journey_map_{journey_id}.html"
        html_path = os.path.join("journey_maps", html_filename)
        os.makedirs("journey_maps", exist_ok=True)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(journey_html)
        
        html_url = f"/journey_maps/{html_filename}"
        return RedirectResponse(url=html_url, status_code=303)
        
    except Exception as e:
        error_msg = f"Error processing files: {str(e)}"
        log.error(error_msg)
        log.error(traceback.format_exc())
        
        # Create a more informative error message based on the type of error
        if "HTTPError" in str(e) and "502" in str(e):
            friendly_error = "OpenAI API server error (502). This is usually a temporary issue with OpenAI's servers. Please try again in a few minutes."
        elif "HTTPError" in str(e) and "500" in str(e):
            friendly_error = "OpenAI API server error (500). This is usually a temporary issue with OpenAI's servers. Please try again in a few minutes."
        elif "HTTPError" in str(e) and "429" in str(e):
            friendly_error = "Rate limit exceeded with OpenAI API. Please try again in a few minutes."
        elif "HTTPError" in str(e) and "401" in str(e):
            friendly_error = "Authentication error with OpenAI API. Please check your API key and try again."
        elif "HTTPError" in str(e) and "400" in str(e):
            friendly_error = "Invalid request to OpenAI API. The request may be too large or contain formatting issues."
        elif "SSLError" in str(e) or "EOF occurred in violation of protocol" in str(e):
            friendly_error = "SSL connection error with OpenAI API. This is a temporary network issue. Please try again in a few minutes."
        elif "timeout" in str(e).lower():
            friendly_error = "Request to OpenAI API timed out. This is usually due to server load. Please try again in a few minutes."
        elif "connection" in str(e).lower() and "error" in str(e).lower():
            friendly_error = "Connection error with OpenAI API. Please check your internet connection and try again."
        elif "not authorized" in str(e).lower():
            friendly_error = "Your organization is not authorized to use the o3 model. Falling back to GPT-4o model."
        else:
            friendly_error = "An error occurred while generating the journey map. Please try again or contact support if the issue persists."
        
        return JSONResponse(
            status_code=500,
            content={
                "error": friendly_error,
                "detailed_error": error_msg,
                "traceback": traceback.format_exc()
            }
        )

# Add mount point for journey maps
app.mount("/journey_maps", StaticFiles(directory="journey_maps"), name="journey_maps")

# Add mount point for static assets
app.mount("/static", StaticFiles(directory="static"), name="static")

# Add mount point for uploads (usually kept private, be cautious about exposing this)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/api/export-pdf/{journey_id}")
async def export_pdf(journey_id: str):
    """
    Server-side PDF export endpoint that converts an HTML journey map to PDF
    with landscape orientation and complete journey capture
    """
    try:
        # Check if journey map exists
        html_filename = f"journey_map_{journey_id}.html"
        html_path = os.path.join("journey_maps", html_filename)
        
        if not os.path.exists(html_path):
            return JSONResponse(
                status_code=404,
                content={"error": "Journey map not found"}
            )
        
        # Path for the generated PDF
        pdf_filename = f"journey_map_{journey_id}.pdf"
        pdf_path = os.path.join("journey_maps", pdf_filename)
        
        # Read the HTML file
        with open(html_path, 'r', encoding='utf-8') as file:
            html_content = file.read()
        
        # Dramatically improve the HTML for PDF rendering
        # This is key to preserving the visual formatting
        enhanced_html = transform_html_for_pdf(html_content)
        
        # Save the modified HTML to a temporary file
        temp_dir = os.path.join("journey_maps", "temp")
        os.makedirs(temp_dir, exist_ok=True)
        temp_html_path = os.path.join(temp_dir, f"temp_{journey_id}.html")
        with open(temp_html_path, 'w', encoding='utf-8') as file:
            file.write(enhanced_html)
        
        # Configure pdfkit options specifically for landscape and complete capture
        options = {
            'page-size': 'A4',
            'orientation': 'Landscape',
            'margin-top': '5mm',
            'margin-right': '5mm',
            'margin-bottom': '5mm',
            'margin-left': '5mm',
            'encoding': 'UTF-8',
            'enable-local-file-access': None,
            'javascript-delay': 2000,
            'enable-javascript': True,
            'no-stop-slow-scripts': True,
            'print-media-type': True,
            'zoom': 0.75,  # Zoom out to fit more content
            'enable-smart-shrinking': True,
            'dpi': 300,
            'disable-internal-links': True,
            'custom-header': [
                ('Accept-Encoding', 'gzip')
            ],
            'no-background': False,  # Ensure backgrounds are included
            'images': True,
            'quiet': ''
        }
        
        # Get wkhtmltopdf configuration
        try:
            from wkhtmltopdf_config import wkhtmltopdf_config
        except ImportError:
            try:
                from src.wkhtmltopdf_config import wkhtmltopdf_config
            except ImportError:
                wkhtmltopdf_config = None
                log.warning("wkhtmltopdf_config not found, using default configuration")
        
        # Try to generate PDF with wkhtmltopdf
        success = False
        error_details = []
        
        # Attempt with full options
        try:
            log.info(f"Attempting PDF generation for {journey_id} with wkhtmltopdf")
            pdfkit.from_file(temp_html_path, pdf_path, options=options, configuration=wkhtmltopdf_config)
            success = True
            log.info(f"Successfully generated PDF: {pdf_path}")
        except Exception as e:
            error_msg = f"wkhtmltopdf PDF generation failed: {str(e)}"
            log.warning(error_msg)
            error_details.append(error_msg)
            
            # Try direct subprocess call as fallback - can often work when pdfkit fails
            try:
                log.info("Attempting PDF generation via direct subprocess call")
                # Build the command with necessary options
                cmd = ['wkhtmltopdf']
                cmd.extend(['--page-size', 'A4'])
                cmd.extend(['--orientation', 'Landscape'])
                cmd.extend(['--margin-top', '5mm'])
                cmd.extend(['--margin-right', '5mm'])
                cmd.extend(['--margin-bottom', '5mm'])
                cmd.extend(['--margin-left', '5mm'])
                cmd.append('--enable-local-file-access')
                cmd.append('--enable-javascript')
                cmd.append('--no-stop-slow-scripts')
                cmd.append('--print-media-type')
                cmd.extend(['--zoom', '0.75'])
                cmd.append('--enable-smart-shrinking')
                cmd.extend(['--dpi', '300'])
                cmd.append('--disable-internal-links')
                cmd.append('--images')
                cmd.append('--quiet')
                cmd.append(temp_html_path)
                cmd.append(pdf_path)
                
                # Run the command
                process = subprocess.run(
                    cmd,
                    check=False,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                if process.returncode == 0:
                    success = True
                    log.info(f"Successfully generated PDF via subprocess call: {pdf_path}")
                else:
                    error_msg = f"Subprocess PDF generation failed: {process.stderr}"
                    log.warning(error_msg)
                    error_details.append(error_msg)
            except Exception as se:
                error_msg = f"Subprocess PDF attempt failed: {str(se)}"
                log.warning(error_msg)
                error_details.append(error_msg)
        
        # Clean up temporary file
        try:
            if os.path.exists(temp_html_path):
                os.remove(temp_html_path)
        except Exception as e:
            log.warning(f"Failed to clean up temporary file: {str(e)}")
        
        # Return the PDF file if generation was successful
        if success and os.path.exists(pdf_path):
            return FileResponse(
                path=pdf_path,
                filename=pdf_filename,
                media_type='application/pdf'
            )
        else:
            # If all attempts failed, provide detailed error
            log.error(f"Failed to generate PDF for {journey_id}: {error_details}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Failed to generate PDF",
                    "details": error_details,
                    "message": "Please try using the browser's print function to save as PDF"
                }
            )
        
    except Exception as e:
        error_msg = f"Error generating PDF: {str(e)}"
        log.error(error_msg)
        log.error(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to generate PDF",
                "message": "Please try using the browser's print function to save as PDF",
                "detail": str(e)
            }
        )

def transform_html_for_pdf(html_content):
    """
    Transform HTML content to make it more suitable for PDF export
    This is critical for preserving visual formatting
    """
    # First make sure we have a complete HTML document
    if not html_content.strip().startswith('<!DOCTYPE html>'):
        html_content = f'<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n</head>\n<body>\n{html_content}\n</body>\n</html>'
    
    # Extract head and body content
    head_match = re.search(r'<head>(.*?)</head>', html_content, re.DOTALL)
    body_match = re.search(r'<body>(.*?)</body>', html_content, re.DOTALL)
    
    head_content = head_match.group(1) if head_match else ""
    body_content = body_match.group(1) if body_match else html_content
    
    # Add special CSS for PDF output
    pdf_styles = """
    <style>
        @page {
            size: A4 landscape;
            margin: 0.5cm;
        }
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: auto;
        }
        body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        .container {
            max-width: none !important;
            width: 100% !important;
            padding: 0.5cm !important;
            overflow: visible !important;
        }
        .journey-map {
            overflow: visible !important;
            page-break-inside: avoid;
            width: 100% !important;
        }
        .journey-timeline {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            min-width: auto !important;
            width: 100% !important;
            overflow: visible !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .journey-stage {
            flex: 1 !important;
            page-break-inside: avoid;
        }
        .export-panel {
            display: none !important;
        }
        /* Preserve all original colors and backgrounds */
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        /* Force columns to be same width for consistency */
        .journey-timeline > * {
            flex: 1 !important;
            width: 0 !important; /* This combined with flex:1 makes columns equal width */
            min-width: 0 !important;
            margin: 0 5px !important;
        }
        /* Ensure all backgrounds and colors are preserved */
        .journey-timeline::before,
        .stage-icon,
        .emotion,
        .pain-points,
        .opportunities,
        .insight-card,
        .kpi-card {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
    </style>
    """
    
    # Create new HTML with our enhanced head and original body
    new_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Journey Map PDF Export</title>
    {head_content}
    {pdf_styles}
</head>
<body>
    {body_content}
</body>
</html>"""
    
    return new_html
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)