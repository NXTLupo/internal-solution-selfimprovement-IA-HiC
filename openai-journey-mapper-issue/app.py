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

# Import our wrapper for o3 model access checking
try:
    from openai_api_wrapper import check_organization_verification, get_available_models
    
    # Get all available models during application startup - force fresh check
    available_models = get_available_models(force_refresh=True)
    print(f"\nAvailable models: {', '.join(available_models)}")
    
    # Check o3 access during application startup
    o3_available = check_organization_verification(force_check=True, model="o3")
    if o3_available:
        print("✅ Successfully verified o3 model access")
        # Ensure environment variable is correctly set if o3 is available
        if os.environ.get("OPENAI_MODEL") != "o3" and os.environ.get("OPENAI_MODEL") is not None:
            print(f"Note: OPENAI_MODEL is set to {os.environ.get('OPENAI_MODEL')} but o3 is available")
    else:
        print("⚠️ No o3 model access available")
        
    # Check for other o-series models
    o_series_models = [model for model in available_models if model.startswith("o") and model != "o3"]
    if o_series_models:
        print(f"\nℹ️ Other o-series models available: {', '.join(o_series_models)}")
    
    # If requested model is o3 but not available, choose best fallback
    if os.environ.get("OPENAI_MODEL") == "o3" and not o3_available:
        # If other o-series models are available, use the best one
        if o_series_models:
            # Use the most advanced model based on simple ordering (o4 > o3 > o1)
            best_fallback = sorted(o_series_models, key=lambda x: x.replace('o', '').split('-')[0], reverse=True)[0]
            os.environ["OPENAI_MODEL"] = best_fallback
            print(f"\n✅ Set default model to {best_fallback} (best available o-series model)")
        else:
            # No o-series models - fall back to gpt-4o
            os.environ["OPENAI_MODEL"] = "gpt-4o"
            print("\n⚠️ Set default model to gpt-4o (no o-series models available)")
    
    # Verify the selected model is actually available
    selected_model = os.environ.get("OPENAI_MODEL")
    if selected_model not in available_models:
        print(f"⚠️ Warning: Selected model '{selected_model}' is not in available models list")
        # If it's not available, choose a better fallback
        if o_series_models:
            os.environ["OPENAI_MODEL"] = o_series_models[0]
            print(f"\n✅ Updated model to {o_series_models[0]} (first available o-series model)")
        elif "gpt-4o" in available_models:
            os.environ["OPENAI_MODEL"] = "gpt-4o"
            print("\n⚠️ Updated model to gpt-4o")
        elif len(available_models) > 0:
            os.environ["OPENAI_MODEL"] = available_models[0]
            print(f"\n⚠️ Updated model to {available_models[0]} (first available model)")
        
except Exception as e:
    print(f"\n⚠️ Warning: Could not verify o3 model access: {str(e)}")
    o3_available = False

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
            error_message = str(e).lower()
            if "invalid_api_key" in error_message or "incorrect api key" in error_message:
                log.error(f"Invalid OpenAI API key: {error_message}")
                openai_key_valid = False
            elif "rate_limit" in error_message or "rate limit" in error_message:
                log.warning(f"Rate limit reached during API key validation: {error_message}")
                # Consider the key valid but warn about rate limits
                openai_key_valid = True
            else:
                log.error(f"OpenAI API key validation failed: {error_message}")
                openai_key_valid = False
    
    # Show error page if OpenAI API key is missing or invalid
    if not openai_api_key or not openai_key_valid:
        try:
            error_path = "templates/api_key_error.html"
            with open(error_path, "r") as f:
                error_html = f.read()
                return HTMLResponse(content=error_html)
        except FileNotFoundError:
            # If error template is missing, return a user-friendly error message
            return HTMLResponse(
                content="""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Key Error - OpenAI Journey Mapper</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      text-align: center;
    }
    .error-container {
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 30px;
      border-top: 4px solid #e74c3c;
    }
    h1 {
      color: #e74c3c;
      margin-bottom: 10px;
    }
    .steps {
      text-align: left;
      max-width: 600px;
      margin: 20px auto;
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 4px;
    }
    .steps ol {
      margin: 0;
      padding-left: 20px;
    }
    .steps li {
      margin-bottom: 10px;
    }
    code {
      background-color: #f1f1f1;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: Monaco, Consolas, 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>OpenAI API Key Error</h1>
    <p>The OpenAI API key is missing or invalid. The Journey Mapper cannot connect to OpenAI's services.</p>
    
    <div class="steps">
      <h3>How to fix this:</h3>
      <ol>
        <li>Get a valid OpenAI API key from <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a></li>
        <li>Update the <code>.env</code> file in the project root with your API key:
          <pre><code>OPENAI_API_KEY=sk-your-api-key-here</code></pre>
        </li>
        <li>Restart the application</li>
      </ol>
      <p><strong>Note:</strong> For access to OpenAI's o3 model, your organization must have o3 access enabled.</p>
    </div>
    
    <p><a href="/">Retry after updating API key</a></p>
  </div>
</body>
</html>"""
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
        # Get actually available models
        available_models = await get_models_async()
        models_options_html = ""
        for model in available_models["models"]:
            selected = "selected" if model == available_models["default"] else ""
            models_options_html += f'<option value="{model}" {selected}>{model}</option>'
        
            # Get o3 and o-series model verification status
        try:
            from openai_api_wrapper import get_available_models, check_organization_verification
            available_models = get_available_models(force_refresh=True)
            o_series_models = [model for model in available_models if model.startswith("o")]
            o_series_text = ", ".join(o_series_models) if o_series_models else "None"
            
            # Check o3 specifically since it's the default
            o3_available = "o3" in o_series_models
            if not o3_available and DEFAULT_OPENAI_MODEL == "o3":
                # Double-check with direct verification
                o3_available = check_organization_verification(force_check=True, model="o3")
                # If it's available but wasn't in our list, add it
                if o3_available and "o3" not in o_series_models:
                    o_series_models.append("o3")
                    o_series_text = ", ".join(o_series_models)
                    # Also update our available_models list
                    if "o3" not in available_models:
                        available_models.append("o3")
            
            # Get status text
            o3_status = "available" if o3_available else "not available (using fallback models)"
                
        except Exception as e:
            log.error(f"Error getting o-series models: {str(e)}")
            o_series_models = []
            o_series_text = "Error checking model availability"
            o3_available = False
            o3_status = "unknown (error checking availability)"
            available_models = ["gpt-4o", "gpt-4", "gpt-3.5-turbo"]
        
        # Show appropriate warning based on available models
        model_warning = ""
        
        # Tiered account message
        tier_info = ""
        if len(o_series_models) >= 3:
            tier_info = "<p><strong>\ud83d\udc4f Tier 4 account detected!</strong> You have access to advanced o-series models.</p>"
        
        # Warning for specific situations
        if not o3_available and DEFAULT_OPENAI_MODEL == "o3":
            fallback_model = "another o-series model" if o_series_models else "gpt-4o"
            model_warning = f"""
            <div style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; margin: 10px 0; border: 1px solid #ffeeba;">
                <strong>Note:</strong> The o3 model is not available for your organization. The system will automatically use {fallback_model} as a fallback.
                {tier_info}
            </div>
            """
        elif o_series_models:
            model_style = "background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;"
            if not o3_available:
                model_style = "background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;"
                
            model_warning = f"""
            <div style="{model_style} padding: 10px; border-radius: 4px; margin: 10px 0;">
                <strong>Available o-series models:</strong> {o_series_text}
                {tier_info}
            </div>
            """
        
        o3_status_class = 'o3-available' if o3_available else 'o3-unavailable'
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AI Journey Mapper with OpenAI</title>
  <style>
    body {{{{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }}}}
    h1 {{{{
      color: #4264D0;
      margin-bottom: 10px;
    }}}}
    .container {{{{
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 30px;
      margin-top: 20px;
    }}}}
    .form-group {{{{
      margin-bottom: 20px;
    }}}}
    label {{{{
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
    }}}}
    input[type="text"], textarea, select {{{{
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }}}}
    textarea {{{{
      height: 100px;
    }}}}
    .file-input {{{{
      border: 2px dashed #ddd;
      padding: 20px;
      text-align: center;
      border-radius: 4px;
      margin-bottom: 10px;
    }}}}
    .file-input:hover {{{{
      border-color: #4264D0;
    }}}}
    .submit-button {{{{
      background-color: #4264D0;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s;
    }}}}
    .submit-button:hover {{{{
      background-color: #3450A0;
    }}}}
    .file-list {{{{
      list-style: none;
      padding: 0;
    }}}}
    .file-list li {{{{
      padding: 5px;
      border-bottom: 1px solid #eee;
    }}}}
    .model-info {{{{
      margin-top: 10px;
      font-size: 0.9em;
      color: #666;
    }}}}
    .refresh-button {{{{
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 14px;
      cursor: pointer;
      margin-left: 10px;
      transition: background-color 0.3s;
    }}}}
    .refresh-button:hover {{{{
      background-color: #e0e0e0;
    }}}}
    .model-selection {{{{
      display: flex;
      align-items: center;
    }}}}
    #model-status {{{{
      margin-top: 5px;
      font-size: 0.85em;
      color: #888;
    }}}}
    .o3-status {{{{
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      margin-left: 10px;
    }}}}
    .o3-available {{{{
      background-color: rgba(40, 167, 69, 0.1);
      color: #28a745;
      border: 1px solid rgba(40, 167, 69, 0.2);
    }}}}
    .o3-unavailable {{{{
      background-color: rgba(255, 193, 7, 0.1);
      color: #ffc107;
      border: 1px solid rgba(255, 193, 7, 0.2);
    }}}}
    .loading {{{{
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #4264D0;
      animation: spin 1s ease-in-out infinite;
      margin-left: 10px;
      vertical-align: middle;
    }}}}
    @keyframes spin {{{{
      to {{{{ transform: rotate(360deg); }}}}
    }}}}
    .highlight {{{{
      background-color: #f0f4ff;
      border: 1px solid #d0d4ff; 
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
    }}}}
    option.o-series-model {{{{
      font-weight: bold;
      background-color: rgba(66, 100, 208, 0.1);
      color: #4264D0;
    }}}}
    optgroup {{{{
      font-weight: bold;
      font-style: normal;
    }}}}
    optgroup[label="O-Series Reasoning Models"] {{{{
      color: #4264D0;
      background-color: rgba(66, 100, 208, 0.05);
      border-bottom: 1px solid rgba(66, 100, 208, 0.3);
      padding: 4px;
    }}}}
    select {{{{
      padding-top: 0 !important;
    }}}}
    .model-tier-4 {{{{
      position: relative;
    }}}}
    .model-tier-4::after {{{{
      content: "\\u2b50";
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #ffc107;
    }}}}
    optgroup[label="O-Series Reasoning Models"] {{{{
      color: #4264D0;
    }}}}
  </style>
</head>
<body>
  <div class="container">
    <h1>AI Journey Mapper with OpenAI</h1>
    <div class="highlight">
      <p>Using OpenAI models for detailed journey analysis and visualization. o3 model status: <span class="o3-status {o3_status_class}">{o3_status}</span></p>
    </div>
    {model_warning}
    
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
        <div id="model-status">Using available models from your OpenAI account</div>
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
    document.getElementById('files').addEventListener('change', function() {{{{
      const fileLabel = document.getElementById('file-label');
      if (this.files.length > 0) {{{{
        if (this.files.length === 1) {{{{
          fileLabel.textContent = `Selected: ${{{{this.files[0].name}}}}`;
        }}}} else {{{{
          fileLabel.textContent = `Selected ${{{{this.files.length}}}} files`;
        }}}}
      }}}} else {{{{
        fileLabel.textContent = 'Drag files here or click to upload (CSV, TXT, PDF, JSON)';
      }}}}
    }}}});

    document.getElementById('refresh-models').addEventListener('click', function() {{{{
      const button = this;
      const statusElement = document.getElementById('model-status');
      const modelSelect = document.getElementById('llm_model');
      
      button.disabled = true;
      statusElement.innerHTML = 'Loading models... <div class="loading"></div>';
      
      fetch('/api/models')
        .then(response => response.json())
        .then(data => {{{{
          modelSelect.innerHTML = '';
          
          if (data.models && data.models.length > 0) {{{{
            // Group models by type - o-series first, then GPT models
            const oSeriesModels = data.models.filter(m => m.startsWith('o'));
            const gptModels = data.models.filter(m => !m.startsWith('o'));
            
            // Sort o-series models by version (o4 > o3 > o1)
            oSeriesModels.sort((a, b) => {{{{
              const aBase = a.split('-')[0].replace('o', '');
              const bBase = b.split('-')[0].replace('o', '');
              return parseInt(bBase) - parseInt(aBase);  // Descending order
            }}}});
            
            // Add o-series models with special styling
            if (oSeriesModels.length > 0) {{{{
              const oSeriesGroup = document.createElement('optgroup');
              oSeriesGroup.label = 'O-Series Reasoning Models';
              
              oSeriesModels.forEach(model => {{{{
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                option.className = 'o-series-model';
                
                // Mark o1-series models as premium Tier 4 models
                if (model.startsWith('o1')) {{{{
                  option.className = option.className + ' model-tier-4';
                  // Add premium indicator in the name
                  option.textContent = model + ' (Premium)';
                }}}}
                if (model === data.default) {{{{
                  option.selected = true;
                }}}}
                oSeriesGroup.appendChild(option);
              }}}});
              
              modelSelect.appendChild(oSeriesGroup);
            }}}}
            
            // Add GPT models in a separate group
            if (gptModels.length > 0) {{{{
              const gptGroup = document.createElement('optgroup');
              gptGroup.label = 'GPT Models';
              
              gptModels.forEach(model => {{{{
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                if (model === data.default) {{{{
                  option.selected = true;
                }}}}
                gptGroup.appendChild(option);
              }}}});
              
              modelSelect.appendChild(gptGroup);
            }}}}
            
            // If no models in either group, fall back to default behavior
            if (oSeriesModels.length === 0 && gptModels.length === 0) {{{{
              data.models.forEach(model => {{{{
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                if (model === data.default) {{{{
                  option.selected = true;
                }}}}
                modelSelect.appendChild(option);
              }}}});
            }}}}
            
            // Count o-series models and show status message
            const oSeriesCount = oSeriesModels.length;
            const o3Available = data.models.includes('o3');
            
            if (oSeriesCount > 0) {{{{
              if (o3Available) {{{{
                statusElement.innerHTML = `Found ${{{{data.models.length}}}} available models including <strong>${{{{oSeriesCount}}}} o-series models</strong> (o3 verified ✓)`;
              }}}} else {{{{
                statusElement.innerHTML = `Found ${{{{data.models.length}}}} available models including <strong>${{{{oSeriesCount}}}} o-series models</strong>`;
              }}}}
            }}}} else if (data.o3_available) {{{{
              statusElement.innerHTML = `Found ${{{{data.models.length}}}} available models (o3 verified ✓)`;
            }}}} else {{{{
              statusElement.innerHTML = `Found ${{{{data.models.length}}}} available models (no o-series models available)`;
            }}}}
          }}}} else {{{{
            const option = document.createElement('option');
            option.value = "{DEFAULT_OPENAI_MODEL}";
            option.textContent = "{DEFAULT_OPENAI_MODEL}";
            modelSelect.appendChild(option);
            statusElement.textContent = 'No models found. Using default model.';
          }}}}
        }}}})
        .catch(error => {{{{
          console.error('Error refreshing models:', error);
          statusElement.textContent = 'Failed to refresh models. Please try again.';
        }}}})
        .finally(() => {{{{
          button.disabled = false;
        }}}});
    }}}});

    document.getElementById('journey-form').addEventListener('submit', function(event) {{{{
      const files = document.getElementById('files').files;
      if (files.length === 0) {{{{
        event.preventDefault();
        alert('Please select at least one file to upload');
      }}}} else {{{{
        const submitButton = document.getElementById('submit-button');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing... This may take a few minutes';
      }}}}
    }}}});
  </script>
</body>
</html>"""
        return HTMLResponse(content=html_content)

async def get_models_async():
    """
    Get available models asynchronously
    """
    try:
        # Get actual available models
        models = get_available_models()
        
        # Check if o3 is verified for access
        from openai_api_wrapper import check_organization_verification
        o3_verified = check_organization_verification()
        
        # If o3 is not available but was requested as default, use gpt-4o
        default_model = DEFAULT_OPENAI_MODEL
        if default_model == "o3" and not o3_verified:
            default_model = "gpt-4o"
            log.warning("o3 not available for this organization, using gpt-4o as default")
            
        # Ensure models list reflects actual availability
        if "o3" in models and not o3_verified:
            models.remove("o3")
            log.warning("Removed o3 from available models as it's not verified for this organization")
            
        if o3_verified and "o3" not in models:
            models.insert(0, "o3")
            log.info("Added o3 to available models as it's verified for this organization")
            
        return {
            "models": models,
            "default": default_model,
            "o3_available": o3_verified
        }
    except Exception as e:
        log.error(f"Error getting models: {str(e)}")
        return {
            "models": ["gpt-4o", "gpt-4", "gpt-3.5-turbo"],
            "default": "gpt-4o",
            "o3_available": False
        }

@app.get("/api/models")
async def get_models():
    """
    Return the list of OpenAI-based models that are actually available to this organization
    """
    return await get_models_async()

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
        # Now check for o3 access with verification
        o3_access = check_organization_verification()
        
        # Get available models with verification
        available_models = get_available_models()
        
        # Validate o3 inclusion in models list
        if o3_access and "o3" not in available_models:
            available_models.insert(0, "o3")
        elif not o3_access and "o3" in available_models:
            available_models.remove("o3")
        
        # Log detailed info for debugging
        log.info(f"API key check: valid=True, o3_available={o3_access}, models={available_models}")
        
        return {
            "valid": True,
            "o3_available": o3_access,
            "available_models": available_models,
            "message": "o3 is not available" if not o3_access and DEFAULT_OPENAI_MODEL == "o3" else ""
        }
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
    
    # Get the model from form input or environment variable
    model_to_use = llm_model if llm_model else os.getenv("OPENAI_MODEL", "o3")
    log.info(f"Requested model: {model_to_use}")
    
    # Get available models
    available_models = get_available_models()
    o_series_models = [model for model in available_models if model.startswith("o")]
    
    # Check if the requested model is available
    if model_to_use not in available_models:
        log.warning(f"Model {model_to_use} was requested but is not available.")
        
        # Find the best fallback model
        if model_to_use.startswith("o") and o_series_models:
            # Try to find another o-series model
            fallback_model = sorted(o_series_models, 
                               key=lambda x: (x.split('-')[0].replace('o',''), '-mini' not in x), 
                               reverse=True)[0]
            log.warning(f"Falling back to alternative o-series model: {fallback_model}")
            model_to_use = fallback_model
        elif "gpt-4o" in available_models:
            log.warning("Falling back to gpt-4o.")
            model_to_use = "gpt-4o"
        elif available_models:
            log.warning(f"Falling back to first available model: {available_models[0]}")
            model_to_use = available_models[0]
        else:
            log.error("No available models found! Attempting to use gpt-4o as last resort.")
            model_to_use = "gpt-4o"
            
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
        
        # Store what model was actually used (could be different due to fallback)
        actual_model_used = journey_map.get("model_used", getattr(custom_journey_mapper, "openai_model", model_to_use))
        
        # Double-check if o3 is the requested model but not available
        if model_to_use == "o3" and not o3_available and "o3 not available" not in actual_model_used:
            actual_model_used = "gpt-4o (o3 not available)"
        
        html_content_path = os.path.join(journey_dir, "journey_html.txt")
        with open(html_content_path, "w", encoding="utf-8") as f:
            f.write(journey_map.get("interactive_html", ""))
        
        summary_path = os.path.join(journey_dir, "journey_summary.txt")
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write(journey_map.get("journey_summary", "No summary available"))
        
        log.info("Retrieving interactive HTML visualization...")
        journey_html = custom_journey_mapper.render_journey_map_html(journey_map)
        
        # Update the model_info_html to show what model was actually used
        from openai_api_wrapper import is_using_fallback_model
        
        # If we've fallen back, make sure the displayed model reflects that
        if is_using_fallback_model() and "not available" not in actual_model_used:
            actual_model_used = "gpt-4o (o3 not available)"
            
        reasoning_effort = os.getenv("REASONING_EFFORT", "medium") if "o3" in actual_model_used and "not available" not in actual_model_used else ""
        
        # Build the reasoning label safely without f-strings
        reasoning_label = ""
        if "o3" in actual_model_used and "not available" not in actual_model_used:
            reasoning_label = "with " + str(reasoning_effort) + " reasoning effort"
        
        # Replace model info in HTML with accurate information
        # First try to find and replace existing model info
        model_info_pattern = r'<div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0\.8em; color: #666;">\s*Generated with <strong>OpenAI[^<]*</strong>[^<]*on[^<]*\s*</div>'
        
        # Apply styling based on model - red warning styling if fallback was used
        model_style = "" if "not available" not in actual_model_used else " style=\"color: #e74c3c; font-weight: bold\"" 
        
        # Use string concatenation instead of f-strings to avoid issues with curly braces
        date_display = datetime.now().strftime('%Y-%m-%d')
        
        model_info_html = """
<div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0.8em; color: #666;">
  Generated with <strong""" + model_style + """>OpenAI """ + str(actual_model_used) + """</strong> """ + reasoning_label + """ on """ + date_display + """
</div>
"""
        
        if re.search(model_info_pattern, journey_html):
            journey_html = re.sub(model_info_pattern, model_info_html, journey_html)
        else:
            # If no existing model info, add it before </body>
            if "</body>" in journey_html:
                journey_html = journey_html.replace("</body>", model_info_html + "</body>")
        
        summary_html = ""
        if "journey_summary" in journey_map and journey_map["journey_summary"]:
            # Extract the summary content safely
            summary_content = str(journey_map["journey_summary"])
            
            # Use string concatenation instead of f-strings
            summary_html = """
<div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4264D0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #4264D0; margin-top: 0; font-size: 1.4rem;">Journey Analysis Summary</h2>
    <div style="white-space: pre-line; font-size: 0.95rem; line-height: 1.6;">""" + summary_content + """</div>
</div>
"""
        
        # Insert summary_html after <body>
        if "<body>" in journey_html:
            body_pos = journey_html.find("<body>") + len("<body>")
            journey_html = journey_html[:body_pos] + summary_html + journey_html[body_pos:]
            
        # Create export functionality HTML
        export_script_html = """
<script src="/static/journey_export.js"></script>
"""
        
        # Insert export functionality before </body> if not already present
        if export_script_html not in journey_html and "</body>" in journey_html:
            journey_html = journey_html.replace("</body>", export_script_html + "</body>")
        
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
        error_str = str(e).lower()
        
        if "unsupported parameter" in error_str and "temperature" in error_str:
            friendly_error = "Parameter compatibility issue with the selected model. Please try a different model or try again."
            # Update environment settings for future calls
            log.info("Setting o-series temperature compatibility flag for future requests")
            os.environ["DISABLE_O_SERIES_TEMPERATURE"] = "true"
        elif "parameter" in error_str and "not supported" in error_str:
            friendly_error = "Parameter compatibility issue with the selected model. Please try a different model or try again."
        elif "HTTPError" in str(e) and "502" in str(e):
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
        elif "timeout" in error_str:
            friendly_error = "Request to OpenAI API timed out. This is usually due to server load. Please try again in a few minutes."
        elif "connection" in error_str and "error" in error_str:
            friendly_error = "Connection error with OpenAI API. Please check your internet connection and try again."
        elif "not authorized" in error_str:
            friendly_error = "Your organization is not authorized to use the selected model. Please try a different model."
        elif "model access" in error_str:
            # Find which model is mentioned in the error
            model_error = model_to_use if model_to_use in error_str else "the selected model"
            friendly_error = f"You do not have access to {model_error}. Please try a different model."
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