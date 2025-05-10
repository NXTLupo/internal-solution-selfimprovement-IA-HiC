from flask import Blueprint
from .api_llm_analyzer import llm_analyzer_bp
from .api_local_llm import local_llm_bp
from .api_topic_model import topic_model_bp
from .api_user import user_bp

api_bp = Blueprint('api', __name__)

# Register the reddit blueprint
api_bp.register_blueprint(llm_analyzer_bp, url_prefix='/llm-analyzer')

# Register the user blueprint
api_bp.register_blueprint(user_bp, url_prefix='/user')

def register_routes(app):
    # Register the local_llm blueprint directly to the app with proper prefix
    app.register_blueprint(local_llm_bp, url_prefix='/api/llm')
    # Register the topic model blueprint
    app.register_blueprint(topic_model_bp, url_prefix='/api/topic-model')
    # ... other route registrations ...

