from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from .routes.api import api_bp, register_routes
from .routes.api_pgvector import rag_bp
from app.routes.api_user import user_bp
import nltk
from util.llm_models.pgvector.pgvector import create_pgvector_tables
import logging

# Disable Azure HTTP logging by setting log level to ERROR
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.ERROR)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Download required NLTK data
    try:
        nltk.download('punkt')
        print("[app] Successfully downloaded NLTK data")
    except Exception as e:
        print(f"[app] Error downloading NLTK data: {str(e)}")
    
    # Configure CORS with proper settings
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # Register the main API blueprint
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Register additional routes (like local_llm)
    register_routes(app)
    
    # Register the RAG blueprint
    app.register_blueprint(rag_bp, url_prefix='/api/rag')
    
    # Register the user blueprint
    app.register_blueprint(user_bp, url_prefix='/api/user')
    
    # Initialize PGVector tables
    try:
        create_pgvector_tables()
        print("[app] Successfully initialized PGVector tables")
    except Exception as e:
        print(f"[app] Error initializing PGVector tables: {str(e)}")
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}, 200
    
    return app 