from flask import Flask
from flask_cors import CORS
from app.routes.api import api_bp
from app.db_init import init_db
import os

def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow requests from any origin
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register the main API blueprint (which includes all sub-blueprints)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Initialize database
    if os.environ.get('INIT_DB', 'false').lower() == 'true':
        init_db()
    
    return app 