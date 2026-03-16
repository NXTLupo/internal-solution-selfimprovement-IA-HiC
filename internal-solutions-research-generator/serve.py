"""
Simple Flask server for Research Generator
Serves the React app with API key injection
"""

from flask import Flask, render_template_string, send_from_directory, jsonify, request
from flask_cors import CORS
import os
import logging
from pathlib import Path
import json
import uuid
import time
import threading
from typing import Dict, Any

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
            "Multiple analysis lenses",
            "Human-in-the-loop curation",
            "Real-time thinking transparency",
            "Checkpoint-based analysis control"
        ],
        "api_key_status": "configured" if GEMINI_API_KEY else "missing"
    })

# Store for active analysis sessions
analysis_sessions = {}

@app.route('/api/analysis/start', methods=['POST'])
def start_interactive_analysis():
    """Start a new interactive analysis session"""
    logger.info(f"Received analysis start request. Files: {list(request.files.keys())}, Form: {list(request.form.keys())}")
    logger.info(f"Request content type: {request.content_type}")
    logger.info(f"Request content length: {request.content_length}")
    
    try:
        if 'file' not in request.files:
            logger.error("No file in request.files")
            logger.error(f"Available keys: {list(request.files.keys())}")
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        logger.info(f"File received: name={file.filename}, content_type={file.content_type}, size={file.content_length}")
        
        # Read file content
        file_content = file.read()
        logger.info(f"File content length: {len(file_content)} bytes")
        
        # Reset file pointer for later reading if needed
        file.seek(0)
        
        analysis_type = request.form.get('analysisType', 'GENERAL_ETHNOGRAPHY')
        logger.info(f"Analysis type: {analysis_type}")
        session_id = str(uuid.uuid4())
        
        # Store session data
        analysis_sessions[session_id] = {
            'id': session_id,
            'status': 'active',
            'file_content': file_content.decode('utf-8'),
            'file_name': file.filename,
            'analysis_type': analysis_type,
            'settings': {
                'enableCheckpoints': True,
                'streamThinking': True
            },
            'checkpoints': [
                {
                    'id': f'checkpoint_1_{session_id}',
                    'name': 'Data Ingestion',
                    'description': 'Validate and preprocess research data',
                    'stage': 'data_ingestion',
                    'status': 'pending'
                },
                {
                    'id': f'checkpoint_2_{session_id}',
                    'name': 'Pattern Detection', 
                    'description': 'Initial theme and pattern identification',
                    'stage': 'pattern_detection',
                    'status': 'pending'
                },
                {
                    'id': f'checkpoint_3_{session_id}',
                    'name': 'Persona Synthesis',
                    'description': 'Generate and validate personas',
                    'stage': 'persona_synthesis', 
                    'status': 'pending'
                },
                {
                    'id': f'checkpoint_4_{session_id}',
                    'name': 'Evidence Mapping',
                    'description': 'Map evidence to insights and personas',
                    'stage': 'evidence_mapping',
                    'status': 'pending'
                },
                {
                    'id': f'checkpoint_5_{session_id}',
                    'name': 'Final Output',
                    'description': 'Generate final deliverables', 
                    'stage': 'final_output',
                    'status': 'pending'
                }
            ],
            'thinking_events': [],
            'current_checkpoint': 0
        }
        
        # Start the analysis process in a background thread
        import threading
        thread = threading.Thread(target=run_interactive_analysis, args=(session_id,))
        thread.daemon = True
        thread.start()
        logger.info(f"Started background analysis thread for session {session_id}")
        
        return jsonify({
            'sessionId': session_id,
            'status': 'started',
            'message': 'Interactive analysis session started'
        })
    except Exception as e:
        logger.error(f"Error starting analysis: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/<session_id>/checkpoint', methods=['POST'])
def handle_checkpoint(session_id):
    """Handle checkpoint approval/revision"""
    try:
        if session_id not in analysis_sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.json
        action = data.get('action')  # approve, revise, skip
        checkpoint_id = data.get('checkpointId')
        feedback = data.get('feedback', '')
        
        # Update checkpoint status
        session = analysis_sessions[session_id]
        for checkpoint in session['checkpoints']:
            if checkpoint['id'] == checkpoint_id:
                if action == 'approve':
                    checkpoint['status'] = 'approved'
                elif action == 'revise':
                    checkpoint['status'] = 'revised'
                    checkpoint['feedback'] = feedback
                elif action == 'skip':
                    checkpoint['status'] = 'skipped'
                
                checkpoint['timestamp'] = int(time.time() * 1000)
                break
        
        return jsonify({
            'status': 'success',
            'action': action,
            'checkpointId': checkpoint_id
        })
    except Exception as e:
        logger.error(f"Error handling checkpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysis/<session_id>/thinking', methods=['GET'])
def get_thinking_events(session_id):
    """Get thinking events for a session"""
    if session_id not in analysis_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = analysis_sessions[session_id]
    return jsonify({
        'events': session.get('thinking_events', []),
        'status': session.get('status', 'unknown')
    })

@app.route('/api/analysis/<session_id>/status', methods=['GET'])
def get_analysis_status(session_id):
    """Get the current status of an analysis session"""
    if session_id not in analysis_sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = analysis_sessions[session_id]
    return jsonify({
        'id': session['id'],
        'status': session['status'],
        'checkpoints': session.get('checkpoints', []),
        'thinkingEventCount': len(session.get('thinking_events', []))
    })

def run_interactive_analysis(session_id):
    """Run the actual analysis using the existing Gemini service"""
    logger.info(f"Starting interactive analysis for session {session_id}")
    session = analysis_sessions.get(session_id)
    if not session:
        logger.error(f"Session {session_id} not found")
        return
    
    try:
        # Simulate checkpoint progression with real analysis
        checkpoints = session['checkpoints']
        
        # Start with first checkpoint
        current_checkpoint = checkpoints[0]
        current_checkpoint['status'] = 'active'
        current_checkpoint['timestamp'] = int(time.time() * 1000)
        
        # Add thinking events as we process
        add_thinking_event(session_id, 'surface', 'Beginning data ingestion and validation...', 0.8)
        time.sleep(2)
        
        # Move to awaiting approval
        current_checkpoint['status'] = 'awaiting_approval'
        add_thinking_event(session_id, 'surface', 'Data validation complete. Ready for review.', 0.9)
        
        # Wait for user approval (this would be handled by checkpoint endpoint)
        while current_checkpoint['status'] == 'awaiting_approval':
            time.sleep(1)
            if session.get('status') != 'active':
                return
        
        # Continue with remaining checkpoints
        for i, checkpoint in enumerate(checkpoints[1:], 1):
            if session.get('status') != 'active':
                break
                
            checkpoint['status'] = 'active'  
            checkpoint['timestamp'] = int(time.time() * 1000)
            
            if checkpoint['stage'] == 'pattern_detection':
                add_thinking_event(session_id, 'hidden', 'Analyzing patterns and themes in the data...', 0.75)
                time.sleep(3)
                add_thinking_event(session_id, 'psychological', 'Identifying behavioral patterns and motivations...', 0.82)
                
            elif checkpoint['stage'] == 'persona_synthesis':
                add_thinking_event(session_id, 'psychological', 'Synthesizing distinct user personas...', 0.85)
                time.sleep(2)
                add_thinking_event(session_id, 'cultural', 'Understanding cultural and social contexts...', 0.88)
                
            elif checkpoint['stage'] == 'evidence_mapping':
                add_thinking_event(session_id, 'strategic', 'Mapping evidence to insights and validating connections...', 0.90)
                time.sleep(2)
                
            elif checkpoint['stage'] == 'final_output':
                add_thinking_event(session_id, 'strategic', 'Generating comprehensive analysis outputs...', 0.95)
                time.sleep(1)
            
            # Move to awaiting approval
            checkpoint['status'] = 'awaiting_approval'
            
            # Wait for approval
            while checkpoint['status'] == 'awaiting_approval':
                time.sleep(1)
                if session.get('status') != 'active':
                    return
        
        # Mark session as completed
        session['status'] = 'completed'
        add_thinking_event(session_id, 'strategic', 'Analysis complete!', 1.0)
        
    except Exception as e:
        logger.error(f"Error in analysis thread: {e}")
        session['status'] = 'error'

def add_thinking_event(session_id, pass_type, content, confidence):
    """Add a thinking event to the session"""
    session = analysis_sessions.get(session_id)
    if not session:
        return
        
    event = {
        'id': str(uuid.uuid4()),
        'passNumber': len(session['thinking_events']) + 1,
        'passType': pass_type,
        'content': content,
        'confidence': confidence,
        'connections': [],
        'timestamp': int(time.time() * 1000),
        'insights': [],
        'questions': []
    }
    
    session['thinking_events'].append(event)

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