"""
Simple Flask server for Research Generator
Serves the React app with API key injection
"""

from flask import Flask, render_template_string, send_from_directory, jsonify
from flask_cors import CORS
import os
import logging
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get API key from environment
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
PORT = int(os.environ.get('PORT', 5011))

# Development template when built files are not available
DEVELOPMENT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PersonaStory AI - Research Generator</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #0891b2 0%, #6366f1 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 600px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .status {
            background: #e8f5e8;
            color: #2d5a2d;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .build-command {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            margin: 20px 0;
        }
    </style>
    <script>
        window.API_KEY = "{{ api_key }}";
        window.process = {env: {API_KEY: "{{ api_key }}"}};
    </script>
</head>
<body>
    <div class="container">
        <h1>🔬 PersonaStory AI Research Generator</h1>
        <div class="status">
            ✅ Service is running successfully
        </div>
        <div class="warning">
            ⚠️ Development Mode - React app needs to be built
        </div>
        <p>The Research Generator service is running but the React app needs to be built.</p>
        <div class="build-command">
            <code>
                cd internal-solutions-research-generator<br>
                npm install<br>
                npm run build
            </code>
        </div>
        <p>After building, refresh this page to see the application.</p>
        <p><small>API Key Status: {% if api_key %}✅ Configured{% else %}❌ Missing{% endif %}</small></p>
    </div>
</body>
</html>
"""

# Get the static files directory
STATIC_DIR = Path(__file__).parent / "dist"

@app.route('/')
def index():
    """Serve the main React app with injected API key"""
    try:
        # Try to serve the built React app from dist directory
        if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
            # Read the HTML file and inject the API key
            with open(STATIC_DIR / "index.html", 'r') as f:
                html_content = f.read()
            
            # Inject the API key script before the closing head tag
            api_key_script = f'''<script>
                window.API_KEY = "{GEMINI_API_KEY}";
                window.process = {{env: {{API_KEY: "{GEMINI_API_KEY}"}}}};
            </script>'''
            
            # Insert the script before the closing </head> tag
            html_content = html_content.replace('</head>', f'{api_key_script}</head>')
            
            return html_content
        else:
            # Fallback to development mode template
            return render_template_string(DEVELOPMENT_TEMPLATE, api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Error serving index: {e}")
        return render_template_string(DEVELOPMENT_TEMPLATE, api_key=GEMINI_API_KEY)

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "research-generator",
        "api_key_configured": bool(GEMINI_API_KEY)
    })

@app.route('/api/status')
def api_status():
    """API status endpoint"""
    return jsonify({
        "status": "running",
        "version": "1.0.0",
        "gemini_configured": bool(GEMINI_API_KEY)
    })

@app.route('/api/info')
def service_info():
    """Provide service information for the launchpad"""
    return jsonify({
        "name": "Research Generator",
        "description": "PersonaStory AI - Turn research into stories with Gemini 3 Pro",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "Research analysis with extended thinking",
            "Persona generation with evidence",
            "Video script creation",
            "Strategy deck generation",
            "Multiple analysis lenses"
        ],
        "api_key_status": "configured" if GEMINI_API_KEY else "missing"
    })

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serve asset files from the dist/assets directory"""
    try:
        if STATIC_DIR.exists():
            return send_from_directory(STATIC_DIR / "assets", filename)
        else:
            return jsonify({'error': 'Assets not found'}), 404
    except Exception as e:
        logger.error(f"Error serving asset file {filename}: {e}")
        return jsonify({'error': 'File not found'}), 404

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from the dist directory"""
    try:
        if STATIC_DIR.exists() and (STATIC_DIR / path).exists():
            return send_from_directory(STATIC_DIR, path)
        else:
            # Return the main index for React Router
            return index()
    except Exception as e:
        logger.error(f"Error serving static file {path}: {e}")
        return index()

if __name__ == '__main__':
    logger.info(f"Starting Research Generator on port {PORT}")
    logger.info(f"GEMINI_API_KEY configured: {bool(GEMINI_API_KEY)}")
    
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False
    )