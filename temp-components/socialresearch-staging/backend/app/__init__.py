from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from .routes.api import api_bp
import logging

# Disable Azure HTTP logging by setting log level to ERROR
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.ERROR)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configure CORS with proper settings
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "https://social-research-frontend.kinddune-2ba3deb1.eastus.azurecontainerapps.io"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}, 200
    
    return app 