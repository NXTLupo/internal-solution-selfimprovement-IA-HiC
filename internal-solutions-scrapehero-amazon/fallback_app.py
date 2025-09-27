"""
Fallback app.py that gracefully handles missing dependencies.
Copy this file to app.py if you're facing dependency issues and can't install packages.
"""

from flask import Flask, jsonify, request, render_template, abort, url_for
import os
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check for required dependencies
LLM_ANALYSIS_AVAILABLE = True
MISSING_DEPS = []

try:
    import anthropic
except ImportError:
    MISSING_DEPS.append("anthropic")
    LLM_ANALYSIS_AVAILABLE = False

try:
    import google.generativeai
except ImportError:
    MISSING_DEPS.append("google-generativeai")
    LLM_ANALYSIS_AVAILABLE = False

try:
    import openai
except ImportError:
    MISSING_DEPS.append("openai")
    LLM_ANALYSIS_AVAILABLE = False

try:
    from dotenv import load_dotenv, find_dotenv
    # Load environment variables from .env file
    _env_path = find_dotenv(usecwd=True)
    if _env_path:
        load_dotenv(dotenv_path=_env_path, override=True)
except ImportError:
    MISSING_DEPS.append("python-dotenv")
    LLM_ANALYSIS_AVAILABLE = False

try:
    # Now that we've checked for major dependencies, try to import the rest
    from category_crawler import get_category_products
    from direct_search import get_product_direct, direct_amazon_search
    from market_insights import analyze_search_term
    from selectorlib import Extractor
    import requests
    from dateutil import parser as dateparser
    import time
    import re
    import random
    import html
    import urllib.parse
    from functools import wraps
    
    # Create an Extractor by reading from the YAML file
    e = Extractor.from_yaml_file('selectors.yml')
    
    # If LLM analysis is available, import those modules
    if LLM_ANALYSIS_AVAILABLE:
        try:
            from llm_analyzer import analyze_product_data, get_structured_analysis, answer_question
            from util.llm_models import LLM_PROVIDERS
        except ImportError as e:
            logger.error(f"Failed to import LLM analysis modules: {e}")
            LLM_ANALYSIS_AVAILABLE = False
            MISSING_DEPS.append(str(e))
except ImportError as e:
    logger.error(f"Failed to import required module: {e}")
    abort(500, f"Failed to import required module: {e}")

app = Flask(__name__)

# Flask app configuration
app.static_folder = 'static'
app.template_folder = 'templates'

# Make url_for available in templates
app.jinja_env.globals.update(url_for=url_for)

# Rate limit decorator (simplified version)
def rate_limit(min_interval=3):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            time.sleep(min_interval)
            return f(*args, **kwargs)
        return wrapped
    return decorator

def validate_amazon_url(url):
    """Validate that the URL is an Amazon product URL"""
    if not url or not isinstance(url, str):
        return False
    # More permissive check for Amazon domains
    if 'amazon.' not in url.lower():
        return False
        
    # Check for common product identifiers in the URL
    product_identifiers = ['/dp/', '/gp/product/', '/product/', '/B0', '?pd_rd_w=']
    return any(identifier in url for identifier in product_identifiers)

# Homepage - HTML interface
@app.route('/')
def index():
    if MISSING_DEPS:
        # Pass missing dependencies to template
        return render_template('index.html', missing_deps=MISSING_DEPS)
    return render_template('index.html')

# Health check endpoint
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy', 
        'service': 'scrapehero-amazon',
        'llm_analysis_available': LLM_ANALYSIS_AVAILABLE,
        'missing_dependencies': MISSING_DEPS
    })

# LLM analysis endpoint
@app.route('/api/analyze', methods=['POST'])
def analyze_products():
    if not LLM_ANALYSIS_AVAILABLE:
        return jsonify({
            'error': f'LLM analysis is not available. Missing dependencies: {", ".join(MISSING_DEPS)}',
            'help': 'Run "pip install anthropic google-generativeai openai python-dotenv" to enable LLM analysis'
        }), 503
        
    try:
        # Get data from request
        data = request.get_json()
        
        # Validate request data
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request data'}), 400
            
        # Extract products and query from request
        products = data.get('products', [])
        query = data.get('query', '')
        llm_provider = data.get('llm_provider', 'claude')
        
        # Validate products
        if not products or not isinstance(products, list):
            return jsonify({'error': 'No products provided'}), 400
            
        # Validate LLM provider
        if llm_provider not in LLM_PROVIDERS:
            return jsonify({
                'error': f'Unknown LLM provider: {llm_provider}',
                'available_providers': list(LLM_PROVIDERS.keys())
            }), 400
            
        # Call the LLM analyzer
        analysis_result = analyze_product_data(products, query, llm_provider)
        
        # Return the result
        return jsonify(analysis_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Structured analysis endpoint
@app.route('/api/analyze/structured', methods=['POST'])
def analyze_products_structured():
    if not LLM_ANALYSIS_AVAILABLE:
        return jsonify({
            'error': f'LLM analysis is not available. Missing dependencies: {", ".join(MISSING_DEPS)}',
            'help': 'Run "pip install anthropic google-generativeai openai python-dotenv" to enable LLM analysis'
        }), 503
        
    try:
        # Get data from request
        data = request.get_json()
        
        # Validate request data
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request data'}), 400
            
        # Extract products and query from request
        products = data.get('products', [])
        query = data.get('query', '')
        llm_provider = data.get('llm_provider', 'claude')
        
        # Validate products
        if not products or not isinstance(products, list):
            return jsonify({'error': 'No products provided'}), 400
            
        # Validate LLM provider
        if llm_provider not in LLM_PROVIDERS:
            return jsonify({
                'error': f'Unknown LLM provider: {llm_provider}',
                'available_providers': list(LLM_PROVIDERS.keys())
            }), 400
            
        # Call the LLM analyzer for structured analysis
        analysis_result = get_structured_analysis(products, query, llm_provider)
        
        # Return the result
        return jsonify(analysis_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Question answering endpoint
@app.route('/api/analyze/question', methods=['POST'])
def answer_product_question():
    if not LLM_ANALYSIS_AVAILABLE:
        return jsonify({
            'error': f'LLM analysis is not available. Missing dependencies: {", ".join(MISSING_DEPS)}',
            'help': 'Run "pip install anthropic google-generativeai openai python-dotenv" to enable LLM analysis'
        }), 503
        
    try:
        # Get data from request
        data = request.get_json()
        
        # Validate request data
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid request data'}), 400
            
        # Extract products, query, and question from request
        products = data.get('products', [])
        query = data.get('query', '')
        question = data.get('question', '')
        llm_provider = data.get('llm_provider', 'claude')
        
        # Validate products and question
        if not products or not isinstance(products, list):
            return jsonify({'error': 'No products provided'}), 400
            
        if not question:
            return jsonify({'error': 'No question provided'}), 400
            
        # Validate LLM provider
        if llm_provider not in LLM_PROVIDERS:
            return jsonify({
                'error': f'Unknown LLM provider: {llm_provider}',
                'available_providers': list(LLM_PROVIDERS.keys())
            }), 400
            
        # Call the question answering function
        answer_result = answer_question(products, query, question, llm_provider)
        
        # Return the result
        return jsonify(answer_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get available LLM providers
@app.route('/api/llm-providers', methods=['GET'])
def get_llm_providers():
    if not LLM_ANALYSIS_AVAILABLE:
        return jsonify({
            'error': f'LLM analysis is not available. Missing dependencies: {", ".join(MISSING_DEPS)}',
            'help': 'Run "pip install anthropic google-generativeai openai python-dotenv" to enable LLM analysis',
            'providers': {}
        }), 503
        
    providers = {}
    for key, provider in LLM_PROVIDERS.items():
        providers[key] = {
            'name': provider['name'],
            'model': provider['model'],
            'available': bool(os.getenv(provider['env_var']))
        }
    return jsonify(providers)

# Error handler for 404
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

# Error handler for 500
@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': f'Server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)