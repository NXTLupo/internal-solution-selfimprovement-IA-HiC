from flask import Blueprint
from .api_llm_analyzer import llm_analyzer_bp
from .api_local_llm import local_llm_bp
from .api_topic_model import topic_model_bp
from .api_user import user_bp
from .api_pgvector import rag_bp
from .api_reddit import reddit_bp
from .api_reddit_proxy import reddit_proxy_bp
# 2026-06-11 - api_sentiment.py never landed in this branch; a hard import
# crashed every worker at boot (ModuleNotFoundError), which took down the
# whole backend INCLUDING /api/embed - the HiC proxy's default embedding
# provider. Guarded so a missing optional blueprint degrades that one route
# instead of killing the service.
try:
    from .api_sentiment import sentiment_bp
except ImportError:
    sentiment_bp = None
from .api_embed import embed_bp


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

# Register the RoBERTa sentiment-scoring blueprint (shared with HiC proxy)
if sentiment_bp is not None:
    api_bp.register_blueprint(sentiment_bp, url_prefix='/sentiment')

# Register the local sentence-transformer embedding blueprint (shared with HiC
# proxy) — a quota-free embedding provider so research runs never starve on
# Gemini/OpenAI 429s. Route: /api/embed
api_bp.register_blueprint(embed_bp)
