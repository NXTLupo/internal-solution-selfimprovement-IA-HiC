"""
Flask backend for Research Generator - PersonaStory AI
Serves the React frontend and provides API key injection
"""

from flask import Flask, render_template_string, send_from_directory, jsonify
from flask_cors import CORS
import os
import logging

# Initialize Flask app
app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get API key from environment
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
PORT = int(os.environ.get('PORT', 5011))

# HTML template that injects the API key and serves the React app
INDEX_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PersonaStory AI - Research Generator</title>
    <link rel="icon" type="image/svg+xml" href="/vite.svg">
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module">
        // Inject the API key into the global scope
        window.API_KEY = "{{ api_key }}";
        // Load the app dynamically
        import('/index.tsx');
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    """Serve the main React app with injected API key"""
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set in environment variables")
    
    # Always serve the template since we're in development mode
    return render_template_string(INDEX_TEMPLATE, api_key=GEMINI_API_KEY)

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

# Serve static files from the React build
@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from the React build"""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # Fallback to index for React Router
        return index()

# For Launchpad integration - provide service information
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

if __name__ == '__main__':
    logger.info(f"Starting Research Generator on port {PORT}")
    logger.info(f"GEMINI_API_KEY configured: {bool(GEMINI_API_KEY)}")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False  # Set to False in production
    )