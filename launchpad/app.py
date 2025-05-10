from flask import Flask, render_template, redirect, url_for, jsonify
import os
import requests
import json
import logging
from datetime import datetime
import threading
import time

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Parse URLs from environment variables
def get_dynamic_urls():
    # Internal URLs for service checks (container to container)
    journey_mapper_url = os.environ.get('JOURNEY_MAPPER_URL', 'http://journey-mapper:8000')
    reddit_ripper_url = os.environ.get('REDDIT_RIPPER_URL', 'http://reddit-ripper:5000')
    social_research_url = os.environ.get('SOCIAL_RESEARCH_URL', 'http://social-research:3000')
    
    # External URLs for client browsers
    journey_mapper_client_url = os.environ.get('JOURNEY_MAPPER_CLIENT_URL', 'http://localhost:8080')
    reddit_ripper_client_url = os.environ.get('REDDIT_RIPPER_CLIENT_URL', 'http://localhost:5001')
    social_research_client_url = os.environ.get('SOCIAL_RESEARCH_CLIENT_URL', 'http://localhost:3000')
    
    return {
        'journey_mapper': {
            'client_url': journey_mapper_client_url,
            'internal_url': journey_mapper_url
        },
        'reddit_ripper': {
            'client_url': reddit_ripper_client_url,
            'internal_url': reddit_ripper_url
        },
        'social_research': {
            'client_url': social_research_client_url,
            'internal_url': social_research_url
        }
    }

# Service status cache
services_status = {
    "journey_mapper": {"status": "unknown", "last_checked": None},
    "reddit_ripper": {"status": "unknown", "last_checked": None},
    "social_research": {"status": "unknown", "last_checked": None}
}

def check_service(service_name):
    """Check if a service is running by making a request to its URL"""
    urls = get_dynamic_urls()
    base_url = urls[service_name]['internal_url']
    
    # Use health endpoint for journey mapper
    if service_name == "journey_mapper":
        url = f"{base_url}/health"
    else:
        url = base_url
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            status = "running"
        else:
            status = f"error: {response.status_code}"
    except requests.exceptions.RequestException as e:
        logger.warning(f"Service {service_name} check failed: {str(e)}")
        status = "offline"
    
    # Update status cache
    services_status[service_name] = {
        "status": status, 
        "last_checked": datetime.now().isoformat()
    }

def update_all_services():
    """Update status of all services"""
    check_service("journey_mapper")
    check_service("reddit_ripper")
    check_service("social_research")

# Background service checker thread
def service_checker():
    while True:
        update_all_services()
        time.sleep(10)  # Check every 10 seconds

# Start background thread for service checking
service_checker_thread = threading.Thread(target=service_checker)
service_checker_thread.daemon = True
service_checker_thread.start()

@app.route('/')
def index():
    """Main launchpad page with enhanced UI"""
    # Ensure status is updated before rendering
    update_all_services()
    
    # Get dynamic URLs for client
    urls = get_dynamic_urls()
    
    return render_template('enhanced-index.html', 
                           journey_mapper_url=urls['journey_mapper']['client_url'],
                           reddit_ripper_url=urls['reddit_ripper']['client_url'], 
                           social_research_url=urls['social_research']['client_url'])
                           
@app.route('/classic')
def classic_index():
    """Classic launchpad page"""
    # Ensure status is updated before rendering
    update_all_services()
    
    # Get dynamic URLs for client
    urls = get_dynamic_urls()
    
    return render_template('index.html', 
                           journey_mapper_url=urls['journey_mapper']['client_url'],
                           reddit_ripper_url=urls['reddit_ripper']['client_url'], 
                           social_research_url=urls['social_research']['client_url'])

@app.route('/status')
def status_page():
    """Status page showing service health"""
    # Ensure status is updated before rendering
    update_all_services()
    
    # Get dynamic URLs for client
    urls = get_dynamic_urls()
    
    return render_template('status.html', 
                          services_status=services_status,
                          service_urls=urls)

@app.route('/api/status')
def status():
    """API endpoint to get service status"""
    return jsonify({
        "services": services_status,
        "urls": get_dynamic_urls()
    })

@app.route('/redirect/<service>')
def redirect_to_service(service):
    """Redirect to a specific service"""
    urls = get_dynamic_urls()
    
    if service in urls:
        return redirect(urls[service]['client_url'])
    else:
        return redirect(url_for('index'))

@app.route('/api/urls')
def get_urls():
    """Return the URLs for all services"""
    urls = get_dynamic_urls()
    
    # Extract ports from URLs for display
    def extract_port(url):
        if ":" in url.split("/")[-1]:
            return url.split(":")[-1].split("/")[0]
        return "80" if url.startswith("http://") else "443"
    
    return jsonify({
        'journey_mapper': {
            'url': urls['journey_mapper']['client_url'],
            'port': extract_port(urls['journey_mapper']['client_url'])
        },
        'reddit_ripper': {
            'url': urls['reddit_ripper']['client_url'],
            'port': extract_port(urls['reddit_ripper']['client_url'])
        },
        'social_research': {
            'url': urls['social_research']['client_url'],
            'port': extract_port(urls['social_research']['client_url'])
        },
        'launchpad': {
            'url': os.environ.get('LAUNCHPAD_URL', f"http://localhost:{os.environ.get('PORT', 8000)}"),
            'port': os.environ.get('PORT', 8000)
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=True, host='0.0.0.0', port=port)