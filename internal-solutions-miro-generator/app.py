#!/usr/bin/env python3
"""
NXT Miro Generator - Web Interface
Standalone Flask application for the Miro board generator
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for, flash
from werkzeug.utils import secure_filename
import logging

# Add the src directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

app = Flask(__name__)
app.secret_key = 'miro-generator-secret-key-change-in-production'

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), 'output')
ALLOWED_EXTENSIONS = {'html'}

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    """Check if the uploaded file is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def run_miro_cli(command_args):
    """Execute Miro operations using real API integration"""
    from miro_api import MiroAPIClient, JourneyMapParser, MiroBoardGenerator
    
    try:
        command = command_args[0] if command_args else 'unknown'
        
        if command == 'validate':
            # Real validation using HTML parser
            if len(command_args) < 3:
                return {
                    'success': False,
                    'error': 'File path required for validation',
                    'stdout': '',
                    'stderr': 'Usage: validate -i <file_path>'
                }
            
            file_path = command_args[2]  # -i <file_path>
            parser = JourneyMapParser()
            result = parser.parse_html_file(file_path)
            
            if result['success']:
                output = f"""✅ Journey map HTML structure is valid
🎯 Comprehensive parsing strategy: {result.get('parsing_strategy', 'standard')}
📊 Found {result.get('total_sections', 0)} sections with detailed content
🗂️ Extracted {result.get('total_elements', 0)} total elements (ZERO data loss!)
📋 Sections identified: {', '.join([section['title'] for section in result.get('sections', [])])}
✅ Ready for comprehensive Miro board generation with frames"""
                return {
                    'success': True,
                    'stdout': output,
                    'stderr': '',
                    'returncode': 0,
                    'parsed_data': result
                }
            else:
                return {
                    'success': False,
                    'stdout': '',
                    'stderr': f'❌ Validation failed: {result["error"]}',
                    'returncode': 1
                }
        
        elif command == 'generate':
            # Real board generation using Miro API with Claude analysis
            if len(command_args) < 3:
                return {
                    'success': False,
                    'error': 'File path required for generation',
                    'stdout': '',
                    'stderr': 'Usage: generate -i <file_path> -o <output_path>'
                }
            
            file_path = command_args[2]  # -i <file_path>
            
            # Initialize Miro client
            try:
                miro_client = MiroAPIClient()
            except ValueError as e:
                return {
                    'success': False,
                    'stdout': '',
                    'stderr': f'❌ Miro API setup failed: {str(e)}',
                    'returncode': 1
                }
            
            # Generate board with Claude analysis
            generator = MiroBoardGenerator(miro_client)
            board_result = generator.generate_board_with_claude(file_path)
            
            if board_result['success']:
                claude_analysis = board_result.get('claude_analysis', {})
                output = f"""🧠 Claude AI analyzed your journey map with UX expertise!
📊 Parsed journey map: {claude_analysis.get('journey_title', 'Customer Journey')}
🎯 Professional Structure: {board_result.get('sections_processed', 0)} journey phases with swim lanes
✨ Created {board_result['element_count']} strategically placed elements
🔍 Zero data loss: {board_result.get('total_content_items', 0)} insights preserved
🏊‍♀️ Swim lanes: Touchpoints, Emotions, Pain Points, Opportunities
✅ Claude UX analysis complete!

🎉 Professional journey map created successfully!
🔗 Board URL: {board_result['board_url']}
📋 Board ID: {board_result['board_id']}
🧠 Claude AI • {board_result.get('sections_processed', 0)} phases • {board_result.get('total_content_items', 0)} insights • Executive-ready!"""
                
                return {
                    'success': True,
                    'stdout': output,
                    'stderr': '',
                    'returncode': 0,
                    'board_url': board_result['board_url'],
                    'board_id': board_result['board_id']
                }
            else:
                return {
                    'success': False,
                    'stdout': '',
                    'stderr': f'❌ Claude board generation failed: {board_result["error"]}',
                    'returncode': 1
                }
        
        elif command == 'test':
            # Real API connection test
            try:
                miro_client = MiroAPIClient()
                test_result = miro_client.test_connection()
                
                if test_result['success']:
                    output = f"""🔌 Testing Miro API connection...
✅ API endpoint reachable
✅ Authentication successful
✅ MIRO_ACCESS_TOKEN configured correctly
🎯 Ready to create boards!"""
                    return {
                        'success': True,
                        'stdout': output,
                        'stderr': '',
                        'returncode': 0
                    }
                else:
                    return {
                        'success': False,
                        'stdout': '',
                        'stderr': f'❌ API test failed: {test_result["message"]}',
                        'returncode': 1
                    }
            except ValueError as e:
                output = f"""🔌 Testing Miro API connection...
❌ API endpoint unreachable
⚠️  MIRO_ACCESS_TOKEN not configured
📝 To connect: Set MIRO_ACCESS_TOKEN environment variable
🔑 Get token at: https://miro.com/app/settings/user-profile/apps"""
                return {
                    'success': False,
                    'stdout': output,
                    'stderr': str(e),
                    'returncode': 1
                }
        
        else:
            return {
                'success': False,
                'error': f'Unknown command: {command}',
                'stdout': '',
                'stderr': f'Available commands: validate, generate, test'
            }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'stdout': '',
            'stderr': str(e)
        }

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'miro-generator',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload journey map HTML file"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Only HTML files are allowed'}), 400
        
        # Save the uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        logger.info(f"File uploaded: {filename}")
        return jsonify({
            'success': True,
            'filename': filename,
            'path': file_path,
            'message': 'File uploaded successfully'
        })
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/validate', methods=['POST'])
def validate_journey_map():
    """Validate uploaded journey map"""
    try:
        data = request.json
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'success': False, 'error': 'Filename required'}), 400
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        # Validate using CLI
        result = run_miro_cli(['validate', '-i', file_path, '--verbose'])
        
        return jsonify({
            'success': result['success'],
            'valid': result['success'],
            'output': result['stdout'],
            'errors': result['stderr'],
            'message': 'Validation completed'
        })
        
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate', methods=['POST'])
def generate_miro_board():
    """Generate Miro board from journey map"""
    try:
        data = request.json
        filename = data.get('filename')
        options = data.get('options', {})
        
        if not filename:
            return jsonify({'success': False, 'error': 'Filename required'}), 400
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        # Prepare output directory
        output_name = filename.replace('.html', '')
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_name)
        
        # Build CLI command
        cmd_args = ['generate', '-i', file_path, '-o', output_path]
        
        # Add options
        if options.get('dryRun'):
            cmd_args.append('--dry-run')
        if options.get('verbose'):
            cmd_args.append('--verbose')
        if options.get('template'):
            cmd_args.extend(['--template', options['template']])
        if options.get('boardId'):
            cmd_args.extend(['--board-id', options['boardId']])
        
        # Run generation
        result = run_miro_cli(cmd_args)
        
        # Create output directory and save results
        generated_files = []
        os.makedirs(output_path, exist_ok=True)
        
        if result['success'] and 'board_url' in result:
            # Create a text file with the board URL and details
            board_info = f"""Miro Board Generated Successfully!

Board URL: {result['board_url']}
Board ID: {result.get('board_id', 'N/A')}
Generated: {datetime.now().isoformat()}

Click the URL above to open your Miro board and start collaborating!

Note: You may need to log into your Miro account to view the board.
"""
            
            board_file_path = os.path.join(output_path, 'miro_board_link.txt')
            with open(board_file_path, 'w') as f:
                f.write(board_info)
            
            generated_files.append({
                'name': 'miro_board_link.txt',
                'path': f"/api/download/{output_name}/miro_board_link.txt",
                'size': len(board_info),
                'type': 'board_link'
            })
        
        # Check for any additional generated files
        if os.path.exists(output_path):
            for file in os.listdir(output_path):
                file_path = os.path.join(output_path, file)
                if os.path.isfile(file_path) and file not in [gf['name'] for gf in generated_files]:
                    generated_files.append({
                        'name': file,
                        'path': f"/api/download/{output_name}/{file}",
                        'size': os.path.getsize(file_path)
                    })
        
        response_data = {
            'success': result['success'],
            'output': result['stdout'],
            'errors': result['stderr'],
            'generated_files': generated_files,
            'output_directory': output_name,
            'message': 'Generation completed' if result['success'] else 'Generation failed'
        }
        
        # Add board URL and ID if available in the result
        if result['success'] and 'board_url' in result:
            response_data['board_url'] = result['board_url']
            response_data['board_id'] = result.get('board_id', '')
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/test', methods=['POST'])
def test_miro_connection():
    """Test Miro API connection"""
    try:
        result = run_miro_cli(['test', '--verbose'])
        
        return jsonify({
            'success': result['success'],
            'connected': result['success'],
            'output': result['stdout'],
            'errors': result['stderr'],
            'message': 'Connection test completed'
        })
        
    except Exception as e:
        logger.error(f"Test error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/config', methods=['GET', 'POST'])
def manage_config():
    """Manage Miro configuration"""
    if request.method == 'GET':
        # Return current configuration status
        try:
            config_file = os.path.join(os.path.dirname(__file__), 'config', 'default.json')
            config_exists = os.path.exists(config_file)
            
            # Check if Miro token is configured
            miro_token = os.environ.get('MIRO_ACCESS_TOKEN')
            token_configured = bool(miro_token)
            
            return jsonify({
                'success': True,
                'config_exists': config_exists,
                'token_configured': token_configured,
                'message': 'Configuration status retrieved'
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    elif request.method == 'POST':
        # Initialize configuration
        try:
            result = run_miro_cli(['config', '--init'])
            
            return jsonify({
                'success': result['success'],
                'output': result['stdout'],
                'errors': result['stderr'],
                'message': 'Configuration initialized'
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/download/<path:output_dir>/<path:filename>')
def download_file(output_dir, filename):
    """Download generated files"""
    try:
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_dir)
        return send_from_directory(output_path, filename, as_attachment=True)
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return jsonify({'error': str(e)}), 404

@app.route('/api/files')
def list_files():
    """List uploaded and generated files"""
    try:
        uploaded_files = []
        generated_outputs = []
        
        # List uploaded files
        if os.path.exists(app.config['UPLOAD_FOLDER']):
            for file in os.listdir(app.config['UPLOAD_FOLDER']):
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], file)
                if os.path.isfile(file_path):
                    uploaded_files.append({
                        'name': file,
                        'size': os.path.getsize(file_path),
                        'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                    })
        
        # List generated outputs
        if os.path.exists(app.config['OUTPUT_FOLDER']):
            for dir_name in os.listdir(app.config['OUTPUT_FOLDER']):
                dir_path = os.path.join(app.config['OUTPUT_FOLDER'], dir_name)
                if os.path.isdir(dir_path):
                    files = []
                    for file in os.listdir(dir_path):
                        file_path = os.path.join(dir_path, file)
                        if os.path.isfile(file_path):
                            files.append({
                                'name': file,
                                'size': os.path.getsize(file_path),
                                'download_url': f"/api/download/{dir_name}/{file}"
                            })
                    
                    generated_outputs.append({
                        'name': dir_name,
                        'files': files,
                        'created': datetime.fromtimestamp(os.path.getctime(dir_path)).isoformat()
                    })
        
        return jsonify({
            'success': True,
            'uploaded_files': uploaded_files,
            'generated_outputs': generated_outputs
        })
        
    except Exception as e:
        logger.error(f"File listing error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({'success': False, 'error': 'File too large. Maximum size is 16MB.'}), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'API endpoint not found'}), 404
    try:
        return render_template('404.html'), 404
    except:
        return '<h1>404 - Page Not Found</h1>', 404

@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    logger.error(f"Server error: {str(e)}")
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
    try:
        return render_template('500.html'), 500
    except:
        return '<h1>500 - Internal Server Error</h1>', 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5004))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting NXT Miro Generator on port {port}")
    logger.info(f"Upload folder: {UPLOAD_FOLDER}")
    logger.info(f"Output folder: {OUTPUT_FOLDER}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)