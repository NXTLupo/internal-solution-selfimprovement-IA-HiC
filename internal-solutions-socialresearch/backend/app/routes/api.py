from flask import Blueprint
from .api_llm_analyzer import llm_analyzer_bp
from .api_local_llm import local_llm_bp
from .api_topic_model import topic_model_bp
from .api_user import user_bp
from .api_pgvector import rag_bp
from .api_reddit import reddit_bp
from .api_reddit_proxy import reddit_proxy_bp


# Main API blueprint
api_bp = Blueprint('api', __name__)

# Register all blueprints to the main api_bp (these will be under /api/...)
# Register the LLM analyzer blueprint (originally named 'reddit')
api_bp.register_blueprint(llm_analyzer_bp, url_prefix='/llm-analyzer')

# Register the user blueprint
api_bp.register_blueprint(user_bp, url_prefix='/user')

# Register the local LLM blueprint
api_bp.register_blueprint(local_llm_bp, url_prefix='/llm') 

# Register the topic model blueprint
api_bp.register_blueprint(topic_model_bp, url_prefix='/topic-model')

# Register the RAG vector search blueprint
api_bp.register_blueprint(rag_bp, url_prefix='/rag')

# Register the Reddit blueprint
api_bp.register_blueprint(reddit_bp, url_prefix='/reddit')

# Register the Reddit proxy blueprint for CORS handling
api_bp.register_blueprint(reddit_proxy_bp, url_prefix='/reddit-proxy')
