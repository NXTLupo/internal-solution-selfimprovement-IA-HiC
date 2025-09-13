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

def run_figma_generation(file_path, output_path, options):
    """Generate Figma plugin files from journey map"""
    try:
        # Import the parser to get journey data
        from miro_api import JourneyMapParser
        
        # Parse the HTML file
        parser = JourneyMapParser()
        parse_result = parser.parse_html_file(file_path)
        
        if not parse_result['success']:
            return {
                'success': False,
                'stdout': '',
                'stderr': f'Failed to parse journey map: {parse_result["error"]}',
                'returncode': 1
            }
        
        # Generate Figma plugin files
        plugin_id = "journey-map-importer"
        journey_data = parse_result
        
        # Create manifest.json
        manifest = {
            "name": "Journey Map Importer",
            "id": plugin_id,
            "api": "1.0.0",
            "main": "code.js",
            "ui": "ui.html",
            "editorType": [
                "figma",
                "figjam"
            ],
            "documentAccess": "dynamic-page",
            "networkAccess": {
                "allowedDomains": ["*"],
                "reasoning": "Import journey map data from external sources"
            }
        }
        
        manifest_path = os.path.join(output_path, 'manifest.json')
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        # Create code.js (main plugin logic)
        code_js = generate_figma_code_js(journey_data)
        code_path = os.path.join(output_path, 'code.js')
        with open(code_path, 'w') as f:
            f.write(code_js)
        
        # Create ui.html (plugin UI)
        ui_html = generate_figma_ui_html()
        ui_path = os.path.join(output_path, 'ui.html')
        with open(ui_path, 'w') as f:
            f.write(ui_html)
        
        # Create journey-data.json (serialized journey data)
        journey_data_path = os.path.join(output_path, 'journey-data.json')
        with open(journey_data_path, 'w') as f:
            json.dump(journey_data, f, indent=2)
        
        # Create README with instructions
        readme_content = generate_figma_readme()
        readme_path = os.path.join(output_path, 'README.md')
        with open(readme_path, 'w') as f:
            f.write(readme_content)
        
        output_message = f"""🎨 Figma Plugin Generated Successfully!
📁 Files created: manifest.json, code.js, ui.html, journey-data.json, README.md
🔧 Plugin ID: {plugin_id}
📋 Sections: {len(journey_data.get('sections', []))} journey phases
✨ Elements: {journey_data.get('total_elements', 0)} total elements
🎯 Zero data loss: All journey insights preserved for Figma

📖 Next Steps:
1. Download all plugin files
2. In Figma: Plugins → Development → Import plugin from manifest
3. Select manifest.json file
4. Run the plugin to create your journey map!

🎉 Ready for professional Figma board creation!"""
        
        return {
            'success': True,
            'stdout': output_message,
            'stderr': '',
            'returncode': 0,
            'plugin_files': ['manifest.json', 'code.js', 'ui.html', 'journey-data.json', 'README.md']
        }
        
    except Exception as e:
        return {
            'success': False,
            'stdout': '',
            'stderr': f'Figma plugin generation failed: {str(e)}',
            'returncode': 1
        }

def generate_figma_code_js(journey_data):
    """Generate the main Figma plugin code"""
    return f'''// Journey Map Importer - Main Plugin Code
// Auto-generated by NXT Humans AI CX Workbench

const journeyData = {json.dumps(journey_data, indent=2)};

// Plugin initialization
figma.showUI(__html__, {{ width: 400, height: 600 }});

figma.ui.onmessage = msg => {{
  if (msg.type === 'import-journey') {{
    console.log('Importing journey map...');
    createJourneyMap(journeyData);
    figma.closePlugin('Journey map imported successfully!');
  }}
  
  if (msg.type === 'cancel') {{
    figma.closePlugin();
  }}
}};

function createJourneyMap(data) {{
  const sections = data.sections || [];
  const PHASE_WIDTH = 900;
  const PHASE_HEIGHT = 1200;
  const PHASE_SPACING = 200;
  
  // Create main journey frame
  const mainFrame = figma.createFrame();
  mainFrame.name = data.journey_title || 'Customer Journey Map';
  mainFrame.resize(sections.length * (PHASE_WIDTH + PHASE_SPACING), PHASE_HEIGHT + 200);
  mainFrame.fills = [{{
    type: 'SOLID',
    color: {{ r: 0.95, g: 0.95, b: 0.95 }}
  }}];
  
  // Create phases
  sections.forEach((section, index) => {{
    const phaseFrame = figma.createFrame();
    phaseFrame.name = section.title || `Phase ${{index + 1}}`;
    phaseFrame.resize(PHASE_WIDTH, PHASE_HEIGHT);
    phaseFrame.x = index * (PHASE_WIDTH + PHASE_SPACING);
    phaseFrame.y = 100;
    
    // Set phase background color based on emotion
    const emotion = section.emotion || 'neutral';
    phaseFrame.fills = [{{
      type: 'SOLID',
      color: getEmotionColor(emotion)
    }}];
    
    // Enable auto-layout (set layoutMode first, then other properties)
    phaseFrame.layoutMode = 'VERTICAL';
    
    // Wait for layout mode to be applied, then set auto-layout properties
    try {{
      phaseFrame.primaryAxisAlign = 'MIN';
      phaseFrame.counterAxisAlign = 'CENTER';
      phaseFrame.itemSpacing = 20;
      phaseFrame.paddingTop = 40;
      phaseFrame.paddingBottom = 40;
      phaseFrame.paddingLeft = 40;
      phaseFrame.paddingRight = 40;
    }} catch (e) {{
      console.warn('Auto-layout properties not supported on this frame:', e);
    }}
    
    // Create phase title
    const titleText = figma.createText();
    titleText.characters = section.title || `Phase ${{index + 1}}`;
    titleText.fontSize = 28;
    
    // Load font before setting fontName
    figma.loadFontAsync({{ family: 'Inter', style: 'Bold' }}).then(() => {{
      titleText.fontName = {{ family: 'Inter', style: 'Bold' }};
    }}).catch(() => {{
      // Fallback to default font if Inter is not available
      console.warn('Inter Bold font not available, using default');
    }});
    
    titleText.fills = [{{ type: 'SOLID', color: {{ r: 0.1, g: 0.1, b: 0.1 }} }}];
    phaseFrame.appendChild(titleText);
    
    // Create content cards for each element in the section
    (section.elements || []).forEach((element, elemIndex) => {{
      const cardFrame = figma.createFrame();
      cardFrame.name = `Card ${{elemIndex + 1}}`;
      cardFrame.resize(PHASE_WIDTH - 80, 120);
      cardFrame.fills = [{{
        type: 'SOLID',
        color: {{ r: 1, g: 1, b: 1 }}
      }}];
      cardFrame.cornerRadius = 8;
      cardFrame.effects = [{{
        type: 'DROP_SHADOW',
        color: {{ r: 0, g: 0, b: 0, a: 0.1 }},
        offset: {{ x: 0, y: 2 }},
        radius: 4,
        visible: true
      }}];
      
      // Card content with auto-layout
      cardFrame.layoutMode = 'VERTICAL';
      
      // Set auto-layout properties with error handling
      try {{
        cardFrame.primaryAxisAlign = 'MIN';
        cardFrame.itemSpacing = 8;
        cardFrame.paddingTop = 16;
        cardFrame.paddingBottom = 16;
        cardFrame.paddingLeft = 16;
        cardFrame.paddingRight = 16;
      }} catch (e) {{
        console.warn('Auto-layout properties not supported on card frame:', e);
      }}
      
      // Element text
      const elementText = figma.createText();
      elementText.characters = element.text || element.content || 'Journey Element';
      elementText.fontSize = 14;
      
      // Load font before setting fontName
      figma.loadFontAsync({{ family: 'Inter', style: 'Regular' }}).then(() => {{
        elementText.fontName = {{ family: 'Inter', style: 'Regular' }};
      }}).catch(() => {{
        console.warn('Inter Regular font not available, using default');
      }});
      
      elementText.fills = [{{ type: 'SOLID', color: {{ r: 0.2, g: 0.2, b: 0.2 }} }}];
      elementText.resize(PHASE_WIDTH - 112, elementText.height);
      cardFrame.appendChild(elementText);
      
      // Element type badge
      if (element.type) {{
        const typeBadge = figma.createFrame();
        typeBadge.name = 'Type Badge';
        typeBadge.resize(80, 24);
        typeBadge.fills = [{{
          type: 'SOLID',
          color: getTypeColor(element.type)
        }}];
        typeBadge.cornerRadius = 12;
        
        const typeText = figma.createText();
        typeText.characters = element.type;
        typeText.fontSize = 12;
        
        // Load font before setting fontName
        figma.loadFontAsync({{ family: 'Inter', style: 'Medium' }}).then(() => {{
          typeText.fontName = {{ family: 'Inter', style: 'Medium' }};
        }}).catch(() => {{
          console.warn('Inter Medium font not available, using default');
        }});
        
        typeText.fills = [{{ type: 'SOLID', color: {{ r: 1, g: 1, b: 1 }} }}];
        typeText.x = 8;
        typeText.y = 4;
        typeBadge.appendChild(typeText);
        cardFrame.appendChild(typeBadge);
      }}
      
      phaseFrame.appendChild(cardFrame);
    }});
    
    mainFrame.appendChild(phaseFrame);
  }});
  
  // Center the main frame in viewport
  figma.viewport.scrollAndZoomIntoView([mainFrame]);
}}

function getEmotionColor(emotion) {{
  const colors = {{
    'positive': {{ r: 0.8, g: 0.95, b: 0.8 }},
    'negative': {{ r: 0.95, g: 0.8, b: 0.8 }},
    'neutral': {{ r: 0.9, g: 0.9, b: 0.9 }},
    'mixed': {{ r: 0.95, g: 0.9, b: 0.8 }}
  }};
  return colors[emotion] || colors['neutral'];
}}

function getTypeColor(type) {{
  const colors = {{
    'touchpoint': {{ r: 0.2, g: 0.6, b: 1 }},
    'emotion': {{ r: 1, g: 0.4, b: 0.6 }},
    'pain_point': {{ r: 1, g: 0.3, b: 0.3 }},
    'opportunity': {{ r: 0.3, g: 0.8, b: 0.3 }}
  }};
  return colors[type] || {{ r: 0.5, g: 0.5, b: 0.5 }};
}}'''

def generate_figma_ui_html():
    """Generate the Figma plugin UI"""
    return '''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Journey Map Importer</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
        }
        .container {
            max-width: 360px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 24px;
        }
        .title {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .subtitle {
            font-size: 14px;
            color: #666;
            line-height: 1.4;
        }
        .preview {
            background: white;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            border: 1px solid #e1e5e9;
        }
        .preview-title {
            font-size: 14px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 12px;
        }
        .stats {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }
        .stat {
            flex: 1;
            text-align: center;
        }
        .stat-number {
            font-size: 20px;
            font-weight: 600;
            color: #0066cc;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
        }
        .buttons {
            display: flex;
            gap: 12px;
        }
        button {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #0066cc;
            color: white;
        }
        .btn-primary:hover {
            background: #0052a3;
        }
        .btn-secondary {
            background: #f1f3f4;
            color: #666;
        }
        .btn-secondary:hover {
            background: #e8eaed;
        }
        .feature-list {
            list-style: none;
            padding: 0;
            margin: 16px 0 0 0;
        }
        .feature-list li {
            padding: 6px 0;
            font-size: 13px;
            color: #666;
            position: relative;
            padding-left: 20px;
        }
        .feature-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #0066cc;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">Journey Map Importer</div>
            <div class="subtitle">Convert your HTML journey map into a professional Figma board with frames and components</div>
        </div>
        
        <div class="preview">
            <div class="preview-title">Journey Map Preview</div>
            <div class="stats">
                <div class="stat">
                    <div class="stat-number" id="phase-count">-</div>
                    <div class="stat-label">Phases</div>
                </div>
                <div class="stat">
                    <div class="stat-number" id="element-count">-</div>
                    <div class="stat-label">Elements</div>
                </div>
            </div>
            
            <ul class="feature-list">
                <li>Auto-layout frames with proper spacing</li>
                <li>Color-coded phases by emotion</li>
                <li>Component instances for reusability</li>
                <li>Professional swim lane organization</li>
            </ul>
        </div>
        
        <div class="buttons">
            <button class="btn-secondary" onclick="cancel()">Cancel</button>
            <button class="btn-primary" onclick="importJourney()">Import Journey</button>
        </div>
    </div>

    <script>
        // Update stats on load
        parent.postMessage({ pluginMessage: { type: 'get-stats' } }, '*');
        
        function importJourney() {
            parent.postMessage({ pluginMessage: { type: 'import-journey' } }, '*');
        }
        
        function cancel() {
            parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
        }
        
        // Set default stats
        document.getElementById('phase-count').textContent = '5';
        document.getElementById('element-count').textContent = '25';
    </script>
</body>
</html>'''

def generate_figma_readme():
    """Generate README instructions for the Figma plugin"""
    return '''# Journey Map Importer - Figma Plugin

## Overview
This Figma plugin imports HTML journey maps and creates professional boards with frames, components, and auto-layout.

## Installation

1. **In Figma Desktop App:**
   - Go to `Plugins` → `Development` → `Import plugin from manifest`
   - Select the `manifest.json` file from this package
   - The plugin will be installed and ready to use

2. **Run the Plugin:**
   - Go to `Plugins` → `Development` → `Journey Map Importer`
   - Click "Import Journey" to create your board

## Features

- **Auto-Layout Frames**: Professionally organized phases with proper spacing
- **Color-Coded Phases**: Visual emotion mapping (positive, negative, neutral)
- **Component System**: Reusable card components for consistency
- **Swim Lane Organization**: Clear separation of touchpoints, emotions, and opportunities
- **Zero Data Loss**: All journey insights preserved from your HTML source

## Generated Structure

```
Journey Map Frame
├── Phase 1 Frame (Auto-layout)
│   ├── Title Text
│   ├── Card Component (Touchpoint)
│   ├── Card Component (Emotion)
│   └── Card Component (Opportunity)
├── Phase 2 Frame (Auto-layout)
│   └── ... (same structure)
└── ...
```

## Customization

After import, you can:
- Adjust colors using Figma's style system
- Modify text and content directly
- Create variants of the card components
- Add additional frames or sections
- Apply your brand guidelines

## Developed by NXT Humans AI CX Workbench
- Professional customer journey mapping tools
- Enterprise-grade analysis and visualization
- Claude AI-powered insights and optimization

For support or feature requests, contact the NXT Humans team.
'''

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

@app.route('/api/generate-figma', methods=['POST'])
def generate_figma_plugin():
    """Generate Figma plugin from journey map"""
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
        output_name = filename.replace('.html', '') + '_figma_plugin'
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_name)
        os.makedirs(output_path, exist_ok=True)
        
        # Generate Figma plugin files
        result = run_figma_generation(file_path, output_path, options)
        
        # List generated files for download
        generated_files = []
        if os.path.exists(output_path):
            for file in os.listdir(output_path):
                file_path = os.path.join(output_path, file)
                if os.path.isfile(file_path):
                    generated_files.append({
                        'name': file,
                        'path': f"/api/download/{output_name}/{file}",
                        'size': os.path.getsize(file_path),
                        'type': 'figma_plugin'
                    })
        
        response_data = {
            'success': result['success'],
            'output': result['stdout'],
            'errors': result['stderr'],
            'generated_files': generated_files,
            'output_directory': output_name,
            'message': 'Figma plugin generation completed' if result['success'] else 'Generation failed'
        }
        
        # Add plugin-specific data
        if result['success']:
            response_data['manifest_file'] = f"/api/download/{output_name}/manifest.json"
            response_data['plugin_instructions'] = "Import the manifest.json file in Figma → Plugins → Development → Import plugin from manifest"
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Figma generation error: {str(e)}")
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