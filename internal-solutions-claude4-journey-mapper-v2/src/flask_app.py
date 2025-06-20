from flask import Flask, render_template, jsonify, request
import os
import sys
import json

# Add the project directory to the Python path
project_directory = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_directory not in sys.path:
    sys.path.insert(0, project_directory)

# Import project modules
try:
    from src.data_ingestion.data_processor import DataProcessor
    from src.ai_analysis.journey_analyzer import JourneyAnalyzer
    from src.visualization.journey_map_generator import JourneyMapGenerator
    from src.utils.logger import setup_logger
except ImportError:
    # Alternative import if running directly from the src directory
    try:
        from data_ingestion.data_processor import DataProcessor
        from ai_analysis.journey_analyzer import JourneyAnalyzer
        from visualization.journey_map_generator import JourneyMapGenerator
        from utils.logger import setup_logger
    except ImportError:
        # Last resort import
        import logging
        logging.warning("Using fallback imports")
        sys.path.append(os.path.dirname(__file__))
        from data_ingestion.data_processor import DataProcessor
        from ai_analysis.journey_analyzer import JourneyAnalyzer
        from visualization.journey_map_generator import JourneyMapGenerator
        from utils.logger import setup_logger

# Setup logging
logger = setup_logger()

# Create Flask application
application = Flask(
    __name__,
    static_folder=os.path.join(project_directory, "static"),
    template_folder=os.path.join(project_directory, "templates")
)

# Ensure the CSS directory exists
css_directory = os.path.join(project_directory, "static", "css")
if not os.path.exists(css_directory):
    os.makedirs(css_directory)

# Copy styles.css to the static/css directory if it exists
styles_file_path = os.path.join(project_directory, "src", "styles.css")
if os.path.exists(styles_file_path):
    with open(styles_file_path, "r") as source_file:
        styles_content = source_file.read()
    destination_path = os.path.join(css_directory, "styles.css")
    with open(destination_path, "w") as destination_file:
        destination_file.write(styles_content)
    logger.info(f"Copied styles.css to {css_directory}")

@application.route('/')
def index_page():
    return render_template('index.html')

@application.route('/api/upload', methods=['POST'])
def upload_files():
    if 'files[]' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    uploaded_files = request.files.getlist('files[]')
    
    # Process the uploaded files using the DataProcessor
    data_processor_instance = DataProcessor()
    processed_data = data_processor_instance.process_files(uploaded_files)
    
    return jsonify({"success": True, "data": processed_data})

@application.route('/api/analyze', methods=['POST'])
def analyze_journey():
    request_data = request.get_json(force=True)
    if request_data is None:
        return jsonify({"success": False, "error": "No JSON data provided"}), 400
    
    model_name = request_data.get('model', 'gemma:latest')
    
    # Analyze the journey using the JourneyAnalyzer
    journey_analyzer_instance = JourneyAnalyzer(model=model_name)
    journey_insights = journey_analyzer_instance.analyze(request_data)
    
    return jsonify({"success": True, "journey_insights": journey_insights})

@application.route('/api/generate-map', methods=['POST'])
def generate_map():
    journey_data = request.get_json(force=True)
    if journey_data is None:
        return jsonify({"success": False, "error": "No journey data provided"}), 400
    
    # Generate the journey map using the JourneyMapGenerator
    journey_map_generator_instance = JourneyMapGenerator()
    journey_map = journey_map_generator_instance.generate(journey_data)
    
    return jsonify({"success": True, "journey_map": journey_map})

if __name__ == '__main__':
    application.run(debug=True, port=5000)
