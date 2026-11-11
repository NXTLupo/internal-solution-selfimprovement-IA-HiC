from flask import Flask, render_template, render_template_string, send_from_directory, jsonify, request
from flask_cors import CORS
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from the main workbench .env file
load_dotenv(Path(__file__).parent.parent / ".env")

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the static files directory (where Vite builds)
STATIC_DIR = Path(__file__).parent / "dist"
STATIC_URL_PATH = '/static'

@app.route('/health')
def health_check():
    """Health check endpoint for service monitoring"""
    return jsonify({
        'status': 'healthy',
        'service': 'Consistent Persona Generator',
        'version': '1.0.0'
    })

@app.route('/api/status')
def api_status():
    """API status endpoint"""
    return jsonify({
        'status': 'active',
        'service': 'Consistent Persona Generator API',
        'description': 'AI-powered consistent persona and scene generation tool'
    })

@app.route('/api/video-status')
def video_status():
    """Video generation status monitoring endpoint"""
    import time
    from datetime import datetime
    
    # This endpoint provides information about video generation activity
    # Since video processing happens client-side, this monitors browser polling activity
    status_info = {
        'timestamp': datetime.now().isoformat(),
        'server_time': time.time(),
        'video_processing_location': 'client-side',
        'polling_architecture': {
            'description': 'Video generation calls Gemini Omni (gemini-omni-1.2-flash, Interactions API) directly from the browser; the video returns inline, so new clips need no polling (polling remains only for legacy Veo clips, which now report failed)',
            'storage': 'IndexedDB (ConsistentCharacterDB -> videoClips store)',
            'polling_interval': '5 seconds',
            'max_timeout': '10 minutes (120 attempts)',
            'status_tracking': 'Client-side React state + IndexedDB persistence'
        },
        'monitoring_instructions': {
            'browser_console': 'Check browser DevTools console for polling logs with 🎬 🔄 ⏳ emojis',
            'indexeddb': 'DevTools -> Application -> IndexedDB -> ConsistentCharacterDB -> videoClips',
            'network': 'DevTools -> Network tab -> Filter by "operations" to see Google AI API calls',
            'current_status_check': 'Look for "Generating video..." text in UI or console polling messages'
        },
        'service_status': 'Backend serving static files only - video processing is frontend-only'
    }
    
    return jsonify(status_info)

@app.route('/api/video-debug')
def video_debug():
    """Debug endpoint for video generation troubleshooting"""
    debug_info = {
        'backend_role': 'Static file server only - no video processing',
        'frontend_architecture': {
            'video_generation': 'Gemini Omni 1.2 Flash (gemini-omni-1.2-flash) via POST /v1beta/interactions',
            'polling_system': 'startVideoPolling() function in App.tsx',
            'storage': 'Browser IndexedDB with 4 stores: characters, scenes, videoClips, objects',
            'api_key_injection': 'GEMINI_API_KEY injected via Flask template'
        },
        'troubleshooting_steps': [
            '1. Check browser console for video polling messages',
            '2. Verify API key is present: window.API_KEY in browser console',
            '3. Check IndexedDB: DevTools -> Application -> Storage -> IndexedDB',
            '4. Monitor Network tab for ai.google.dev API calls',
            '5. Look for operation IDs in console logs',
            '6. Check for "Generating video..." UI status'
        ],
        'common_issues': {
            'no_polling_logs': 'Video generation may not have started or completed already',
            'api_errors': 'Check Network tab for failed requests to ai.google.dev',
            'timeout': 'Extended to 10 minutes but complex videos may take longer',
            'missing_operation_id': 'Initial video generation request failed'
        }
    }
    
    return jsonify(debug_info)

@app.route('/api/clear-data', methods=['POST'])
def clear_data():
    """Clear IndexedDB data endpoint - returns instructions for browser-side clearing"""
    clear_instructions = {
        'message': 'IndexedDB clearing initiated',
        'instructions': 'This endpoint provides JavaScript code to clear browser storage',
        'javascript_code': '''
// Clear all IndexedDB data for Consistent Character Generator
(function clearCharacterGeneratorData() {
    console.log('🧹 Clearing Character Generator data...');
    
    // Method 1: Delete the entire database
    const deleteRequest = indexedDB.deleteDatabase('ConsistentCharacterDB');
    
    deleteRequest.onsuccess = function() {
        console.log('✅ Successfully cleared ConsistentCharacterDB');
        alert('✅ Previous video attempts cleared! Please refresh the page.');
    };
    
    deleteRequest.onerror = function() {
        console.log('❌ Error clearing database, trying individual stores...');
        
        // Method 2: Clear individual stores if database deletion fails
        const openRequest = indexedDB.open('ConsistentCharacterDB', 4);
        openRequest.onsuccess = function(event) {
            const db = event.target.result;
            const stores = ['videoClips', 'characters', 'objects', 'scenes'];
            
            stores.forEach(storeName => {
                if (db.objectStoreNames.contains(storeName)) {
                    const transaction = db.transaction(storeName, 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const clearRequest = store.clear();
                    
                    clearRequest.onsuccess = function() {
                        console.log(`✅ Cleared ${storeName} store`);
                    };
                }
            });
            
            alert('✅ Data cleared! Please refresh the page.');
            db.close();
        };
    };
    
    deleteRequest.onblocked = function() {
        console.log('⚠️ Database deletion blocked. Please close other tabs and try again.');
        alert('⚠️ Please close other Character Generator tabs and try again.');
    };
})();
        ''',
        'usage': 'Copy the javascript_code and run it in the browser console, or call this endpoint and follow instructions',
        'note': 'This clears video clips, characters, objects, and scenes from browser storage'
    }
    
    return jsonify(clear_instructions)

@app.route('/')
def index():
    """Serve the main application"""
    try:
        # Try to serve the built React app from dist directory
        if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
            # Read the HTML file and inject the API key
            with open(STATIC_DIR / "index.html", 'r') as f:
                html_content = f.read()
            
            # Inject the Gemini API key as both window global and process.env
            gemini_api_key = os.environ.get('GEMINI_API_KEY', '')
            api_key_script = f'''<script>
                window.API_KEY = "{gemini_api_key}";
                window.process = {{env: {{API_KEY: "{gemini_api_key}"}}}};
            </script>'''
            
            # Insert the script before the closing </head> tag
            html_content = html_content.replace('</head>', f'{api_key_script}</head>')
            
            return html_content
        else:
            # Fallback to development mode template
            return render_template_string(DEVELOPMENT_TEMPLATE)
    except Exception as e:
        logger.error(f"Error serving index: {e}")
        return render_template_string(DEVELOPMENT_TEMPLATE)

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files from both static and dist directories"""
    try:
        # First try the static directory
        static_files_dir = Path(__file__).parent / "static"
        if static_files_dir.exists() and (static_files_dir / filename).exists():
            return send_from_directory(static_files_dir, filename)
        # Fallback to dist directory (for Vite builds)
        elif STATIC_DIR.exists() and (STATIC_DIR / filename).exists():
            return send_from_directory(STATIC_DIR, filename)
        else:
            # Return 404 if neither exists
            return jsonify({'error': 'Static files not found'}), 404
    except Exception as e:
        logger.error(f"Error serving static file {filename}: {e}")
        return jsonify({'error': 'File not found'}), 404

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

@app.route('/vite.svg')
def serve_vite_svg():
    """Serve vite.svg from the dist directory"""
    try:
        if STATIC_DIR.exists() and (STATIC_DIR / "vite.svg").exists():
            return send_from_directory(STATIC_DIR, "vite.svg")
        else:
            return jsonify({'error': 'vite.svg not found'}), 404
    except Exception as e:
        logger.error(f"Error serving vite.svg: {e}")
        return jsonify({'error': 'File not found'}), 404


# Development template when built files are not available
DEVELOPMENT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consistent Persona Generator</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .build-command {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Consistent Persona Generator</h1>
        <div class="status">
            ✅ Service is running successfully
        </div>
        <p>This service provides AI-powered consistent character and scene generation capabilities.</p>
        
        <h3>Development Mode</h3>
        <p>The React frontend needs to be built. Run:</p>
        <div class="build-command">
            npm install && npm run build
        </div>
        <p>Then refresh this page to access the full application.</p>
        
        <h3>API Endpoints</h3>
        <ul style="text-align: left;">
            <li><strong>GET /health</strong> - Health check</li>
            <li><strong>GET /api/status</strong> - API status</li>
        </ul>
    </div>
</body>
</html>
"""

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5010))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"Starting Consistent Persona Generator on port {port}")
    logger.info(f"Static directory: {STATIC_DIR}")
    logger.info(f"Static directory exists: {STATIC_DIR.exists()}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
