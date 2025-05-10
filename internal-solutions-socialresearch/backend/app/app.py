from flask import Flask
from flask_cors import CORS
from app.routes.api_llm_analyzer import llm_analyzer_bp
from app.routes.api_user import user_bp
from app.routes.api_topic import topic_bp
from app.db_init import init_db
import os

def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow requests from any origin
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register blueprints
    app.register_blueprint(llm_analyzer_bp, url_prefix='/api/llm-analyzer')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(topic_bp, url_prefix='/api/topic')
    
    # Initialize database
    if os.environ.get('INIT_DB', 'false').lower() == 'true':
        init_db()
    
    return app 