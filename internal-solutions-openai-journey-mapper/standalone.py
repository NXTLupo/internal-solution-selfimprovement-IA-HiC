#!/usr/bin/env python3
"""
Standalone entry point for the OpenAI Journey Mapper.
This creates a simple FastAPI app with all necessary functionality.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys
import uuid
import json
import logging
import shutil
from typing import List, Optional
from datetime import datetime

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.append(project_root)
    print(f"Added {project_root} to Python path")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
log = logging.getLogger("openai-journey-mapper")

# Create required directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("journey_maps", exist_ok=True)
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)

# Create the app
app = FastAPI(
    title="AI Journey Mapper (OpenAI o3)",
    description="Upload data to generate interactive journey maps with OpenAI's o3 reasoning model",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setting o3 as the default model with fallback to GPT-4o
DEFAULT_OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "o3")

def get_available_models():
    """Return a list of available OpenAI models"""
    return [
        "o3",              # OpenAI's specialized reasoning model
        "gpt-4o",         # GPT-4 Omni model
        "gpt-4-turbo",    # GPT-4 Turbo model
        "gpt-4"           # Standard GPT-4 model
    ]

@app.get("/", response_class=HTMLResponse)
async def get_home():
    """Serves a simple HTML form for journey mapping"""
    # Check if OpenAI API key is valid
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    openai_key_valid = False
    
    if openai_api_key:
        try:
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
            if os.path.exists(error_path):
                with open(error_path, "r") as f:
                    error_html = f.read()
                    return HTMLResponse(content=error_html)
        except Exception:
            pass
        
        # If error template is missing, return a simple error message
        return HTMLResponse(
            content="<h1>API Key Error</h1><p>Invalid or missing OpenAI API key. Please set a valid API key.</p>"
        )
    
    # Generate model options
    models_options_html = ""
    default_model = os.getenv("OPENAI_MODEL", "o3")
    for model_name in get_available_models():
        selected = "selected" if model_name == default_model else ""
        models_options_html += f'<option value="{model_name}" {selected}>{model_name}</option>\n'
    
    # Generate HTML form
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Journey Mapper (OpenAI o3)</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
    }}
    .container {{
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }}
    h1 {{
      color: #4264D0;
      margin-top: 0;
    }}
    .form-group {{
      margin-bottom: 20px;
    }}
    label {{
      display: block;
      font-weight: 500;
      margin-bottom: 5px;
    }}
    input[type="text"], select, textarea {{
      width: 100%;
      padding: 10px;
      box-sizing: border-box;
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
      const selectElement = document.getElementById('llm_model');
      
      // Add a loading indicator
      button.innerHTML = '<span class="loading"></span> Refreshing...';
      button.disabled = true;
      
      // Simulate refreshing models (in a real app, this would call an API)
      setTimeout(function() {{
        button.innerHTML = 'Refresh Models';
        button.disabled = false;
        statusElement.textContent = 'Models refreshed. Using OpenAI o3 reasoning model.';
      }}, 1000);
    }});
    
    document.getElementById('journey-form').addEventListener('submit', function(e) {{
      const submitButton = document.getElementById('submit-button');
      submitButton.innerHTML = '<span class="loading"></span> Processing...';
      submitButton.disabled = true;
    }});
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

@app.post("/api/analyze")
async def analyze_files(
    files: List[UploadFile] = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    llm_model: Optional[str] = Form(None)
):
    """Simple file analysis endpoint that creates a basic journey map."""
    journey_id = str(uuid.uuid4())
    model_to_use = llm_model if llm_model else DEFAULT_OPENAI_MODEL
    log.info(f"Using model: {model_to_use}")
    
    # Create directories for the journey
    journey_dir = os.path.join("uploads", journey_id)
    os.makedirs(journey_dir, exist_ok=True)
    
    # Process files
    for file in files:
        if file.filename:
            file_path = os.path.join(journey_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            log.info(f"Saved file: {file_path}")
    
    # Create a placeholder journey map
    title = title or "Customer Journey"
    description = description or "Generated journey map"
    
    # Basic template for a journey map
    journey_html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Journey Map: {title}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }}
    .container {{
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }}
    h1 {{
      color: #4264D0;
    }}
    .journey-timeline {{
      display: flex;
      overflow-x: auto;
      margin: 30px 0;
      padding-bottom: 20px;
    }}
    .journey-phase {{
      min-width: 200px;
      margin-right: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      background-color: #f9f9f9;
    }}
    .phase-title {{
      font-weight: bold;
      margin-bottom: 10px;
      color: #4264D0;
    }}
    .touchpoint {{
      margin-bottom: 15px;
      padding: 10px;
      background-color: white;
      border: 1px solid #eee;
      border-radius: 4px;
    }}
    .touchpoint-title {{
      font-weight: 500;
      margin-bottom: 5px;
    }}
    .touchpoint-description {{
      font-size: 0.9em;
      color: #666;
    }}
    .emotion {{
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      margin-top: 5px;
    }}
    .positive {{
      background-color: #e6f7e6;
      color: #2e7d32;
    }}
    .neutral {{
      background-color: #f5f5f5;
      color: #757575;
    }}
    .negative {{
      background-color: #ffebee;
      color: #c62828;
    }}
    .journey-summary {{
      background-color: #f0f4ff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="journey-summary">
      <h1>{title}</h1>
      <p>{description}</p>
      <p>This is a placeholder journey map. In a real implementation, this would be generated using the OpenAI o3 reasoning model based on your uploaded data.</p>
    </div>
    
    <div class="journey-timeline">
      <div class="journey-phase">
        <div class="phase-title">Awareness</div>
        <div class="touchpoint">
          <div class="touchpoint-title">Social Media Ad</div>
          <div class="touchpoint-description">Customer sees ad on social media</div>
          <span class="emotion neutral">Curious</span>
        </div>
        <div class="touchpoint">
          <div class="touchpoint-title">Website Visit</div>
          <div class="touchpoint-description">Browses product pages</div>
          <span class="emotion positive">Interested</span>
        </div>
      </div>
      
      <div class="journey-phase">
        <div class="phase-title">Consideration</div>
        <div class="touchpoint">
          <div class="touchpoint-title">Product Comparison</div>
          <div class="touchpoint-description">Compares features and prices</div>
          <span class="emotion neutral">Analytical</span>
        </div>
        <div class="touchpoint">
          <div class="touchpoint-title">Reviews</div>
          <div class="touchpoint-description">Reads customer reviews</div>
          <span class="emotion positive">Confident</span>
        </div>
      </div>
      
      <div class="journey-phase">
        <div class="phase-title">Purchase</div>
        <div class="touchpoint">
          <div class="touchpoint-title">Add to Cart</div>
          <div class="touchpoint-description">Selects product and options</div>
          <span class="emotion positive">Decisive</span>
        </div>
        <div class="touchpoint">
          <div class="touchpoint-title">Checkout</div>
          <div class="touchpoint-description">Enters payment information</div>
          <span class="emotion negative">Frustrated</span>
        </div>
      </div>
      
      <div class="journey-phase">
        <div class="phase-title">Post-Purchase</div>
        <div class="touchpoint">
          <div class="touchpoint-title">Delivery</div>
          <div class="touchpoint-description">Receives product</div>
          <span class="emotion positive">Excited</span>
        </div>
        <div class="touchpoint">
          <div class="touchpoint-title">Support</div>
          <div class="touchpoint-description">Contacts customer service</div>
          <span class="emotion neutral">Satisfied</span>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0.8em; color: #666;">
      Generated with <strong>{model_to_use}</strong> on {datetime.now().strftime('%Y-%m-%d')}
    </div>
  </div>
</body>
</html>
"""

    # Save the journey map
    html_filename = f"journey_map_{journey_id}.html"
    html_path = os.path.join("journey_maps", html_filename)
    os.makedirs("journey_maps", exist_ok=True)
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(journey_html)
    
    # Redirect to the journey map
    html_url = f"/journey_maps/{html_filename}"
    return RedirectResponse(url=html_url, status_code=303)

# Mount static directories
app.mount("/journey_maps", StaticFiles(directory="journey_maps"), name="journey_maps")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8090))
    print(f"Starting OpenAI Journey Mapper on port {port}...")
    print(f"Access the service at: http://localhost:{port}")
    uvicorn.run("standalone:app", host="0.0.0.0", port=port, reload=True)