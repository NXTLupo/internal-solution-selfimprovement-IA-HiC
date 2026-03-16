from flask import Flask, render_template, redirect, url_for, jsonify, request, Response
import os
import requests
import json
import logging
from datetime import datetime
import threading
import time
import uuid
import websockets
import asyncio
from functools import wraps
import importlib.util
import subprocess
import re
import psutil
from anthropic import Anthropic

# Check if flask_sock is available, and import it if so
if importlib.util.find_spec("flask_sock"):
    from flask_sock import Sock
    has_flask_sock = True
else:
    has_flask_sock = False

app = Flask(__name__)
if has_flask_sock:
    sock = Sock(app)

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MCP Configuration
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")

# Initialize Anthropic client if API key is available
anthropic_client = None
if ANTHROPIC_API_KEY:
    try:
        anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
        logger.info("Anthropic client initialized for MCP chatbot")
    except Exception as e:
        logger.error(f"Failed to initialize Anthropic client: {e}")

# MCP requests are now proxied to the agent service

# Parse URLs from environment variables
def get_dynamic_urls(request_is_secure=False):
    # Internal URLs for service checks (container to container)
    journey_mapper_url = os.environ.get('JOURNEY_MAPPER_URL', 'http://journey-mapper:8000')
    reddit_ripper_url = os.environ.get('REDDIT_RIPPER_URL', 'http://reddit-ripper:5000')
    social_research_url = os.environ.get('SOCIAL_RESEARCH_URL', 'http://social-research-frontend:3000')
    video_analyzer_url = os.environ.get('VIDEO_ANALYZER_URL', 'http://video-analyzer:5000')
    miro_generator_url = os.environ.get('MIRO_GENERATOR_URL', 'http://miro-generator:5000')
    consistent_character_generator_url = os.environ.get('CONSISTENT_CHARACTER_GENERATOR_URL', 'http://consistent-character-generator:5010')
    research_generator_url = os.environ.get('RESEARCH_GENERATOR_URL', 'http://research-generator:5011')
    copilot_recipe_generator_url = os.environ.get('COPILOT_RECIPE_GENERATOR_URL', 'http://copilot-recipe-generator:5013')

    # CX Agent and MCP servers (optional)
    reddit_mcp_url = os.environ.get('REDDIT_MCP_URL', 'http://reddit-mcp:8501')
    social_mcp_url = os.environ.get('SOCIAL_MCP_URL', 'http://social-mcp:8502')
    journey_mcp_url = os.environ.get('JOURNEY_MCP_URL', 'http://journey-mcp:8503')
    video_mcp_url = os.environ.get('VIDEO_MCP_URL', 'http://video-mcp:8504')
    research_mcp_url = os.environ.get('RESEARCH_MCP_URL', 'http://research-mcp:8507')
    # Using 'agent' hostname as configured in docker-compose-agent.yml
    agent_url = os.environ.get('AGENT_URL', 'http://agent:8500')
    agent_ws_url = os.environ.get('AGENT_WS_URL', 'ws://agent:8500')
    agent_client_url = os.environ.get('AGENT_CLIENT_URL', 'http://localhost:8090')

    # External URLs for client browsers - dynamically adjust protocol based on request
    logger.info(f"[URL DEBUG] get_dynamic_urls called with request_is_secure={request_is_secure}")
    
    if request_is_secure:
        # HTTPS URLs - use HTTPS proxy ports
        logger.info(f"[URL DEBUG] Using HTTPS URLs")
        journey_mapper_client_url = os.environ.get('JOURNEY_MAPPER_HTTPS_URL', 'https://localhost:8444')
        reddit_ripper_client_url = os.environ.get('REDDIT_RIPPER_HTTPS_URL', 'https://localhost:8446')
        social_research_client_url = os.environ.get('SOCIAL_RESEARCH_HTTPS_URL', 'https://localhost:8447')
        video_analyzer_client_url = os.environ.get('VIDEO_ANALYZER_HTTPS_URL', 'https://localhost:8448')
        miro_generator_client_url = os.environ.get('MIRO_GENERATOR_HTTPS_URL', 'https://localhost:8450')
        consistent_character_generator_client_url = os.environ.get('CONSISTENT_CHARACTER_GENERATOR_HTTPS_URL', 'https://localhost:8456')
        research_generator_client_url = os.environ.get('RESEARCH_GENERATOR_HTTPS_URL', 'https://localhost:8457')
        copilot_recipe_generator_client_url = os.environ.get('COPILOT_RECIPE_GENERATOR_HTTPS_URL', 'https://localhost:8458')
    else:
        # HTTP URLs - use original ports
        logger.info(f"[URL DEBUG] Using HTTP URLs")
        journey_mapper_client_url = os.environ.get('JOURNEY_MAPPER_CLIENT_URL', 'http://localhost:8080')
        reddit_ripper_client_url = os.environ.get('REDDIT_RIPPER_CLIENT_URL', 'http://localhost:5001')
        social_research_client_url = os.environ.get('SOCIAL_RESEARCH_CLIENT_URL', 'http://localhost:3000')
        video_analyzer_client_url = os.environ.get('VIDEO_ANALYZER_CLIENT_URL', 'http://localhost:5002')
        miro_generator_client_url = os.environ.get('MIRO_GENERATOR_CLIENT_URL', 'http://localhost:5004')
        consistent_character_generator_client_url = os.environ.get('CONSISTENT_CHARACTER_GENERATOR_CLIENT_URL', 'http://localhost:5010')
        research_generator_client_url = os.environ.get('RESEARCH_GENERATOR_CLIENT_URL', 'http://localhost:5011')
        copilot_recipe_generator_client_url = os.environ.get('COPILOT_RECIPE_GENERATOR_CLIENT_URL', 'http://localhost:5013')

    urls = {
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
        },
        'video_analyzer': {
            'client_url': video_analyzer_client_url,
            'internal_url': video_analyzer_url
        },
        'miro_generator': {
            'client_url': miro_generator_client_url,
            'internal_url': miro_generator_url
        },
        'consistent_character_generator': {
            'client_url': consistent_character_generator_client_url,
            'internal_url': consistent_character_generator_url
        },
        'research_generator': {
            'client_url': research_generator_client_url,
            'internal_url': research_generator_url
        },
        'copilot_recipe_generator': {
            'client_url': copilot_recipe_generator_client_url,
            'internal_url': copilot_recipe_generator_url
        },
    }

    # Add agent and MCP URLs if CX agent is enabled
    if os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true':
        urls.update({
            'mcp': {
                'reddit': reddit_mcp_url,
                'social': social_mcp_url,
                'journey': journey_mcp_url,
                'video': video_mcp_url,
                'research': research_mcp_url
            },
            'agent': {
                'internal_url': agent_url,
                'ws_url': agent_ws_url,
                'client_url': agent_client_url
            }
        })

    return urls

# Service status cache
services_status = {
    "journey_mapper": {"status": "unknown", "last_checked": None},
    "reddit_ripper": {"status": "unknown", "last_checked": None},
    "social_research": {"status": "unknown", "last_checked": None},
    "video_analyzer": {"status": "unknown", "last_checked": None},
    "miro_generator": {"status": "unknown", "last_checked": None},
    "consistent_character_generator": {"status": "unknown", "last_checked": None},
    "research_generator": {"status": "unknown", "last_checked": None},
    "copilot_recipe_generator": {"status": "unknown", "last_checked": None},
}

# Add agent services if enabled
if os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true':
    services_status.update({
        "reddit_mcp": {"status": "unknown", "last_checked": None},
        "social_mcp": {"status": "unknown", "last_checked": None},
        "journey_mcp": {"status": "unknown", "last_checked": None},
        "claude4_journey_mcp": {"status": "unknown", "last_checked": None},
        "video_mcp": {"status": "unknown", "last_checked": None},
        "research_mcp": {"status": "unknown", "last_checked": None},
        "agent": {"status": "unknown", "last_checked": None}  # Changed from agent_orchestrator to agent
    })

def check_service(service_name):
    """Check if a service is running by making a request to its URL"""
    urls = get_dynamic_urls(request_is_secure=False)  # Always use HTTP for internal service checks

    # Skip checking MCP and agent services if CX agent is disabled
    if service_name in ["reddit_mcp", "social_mcp", "journey_mcp", "claude4_journey_mcp", "video_mcp", "research_mcp", "agent"] and \
       os.environ.get('ENABLE_CX_AGENT', 'false').lower() != 'true':
        return

    # Get base URL for the service
    if service_name in ["reddit_mcp", "social_mcp", "journey_mcp", "claude4_journey_mcp", "video_mcp", "research_mcp"]:
        # Handle MCP servers
        if service_name == "claude4_journey_mcp":
            mcp_type = "claude4_journey"  # Special case for claude4_journey_mcp
        else:
            mcp_type = service_name.split('_')[0]  # Extract reddit, social, journey, research
        if 'mcp' not in urls or mcp_type not in urls['mcp']:
            logger.warning(f"URL for {service_name} not found in configuration")
            services_status[service_name] = {
                "status": "unknown",
                "last_checked": datetime.now().isoformat(),
                "message": "Service URL not configured"
            }
            return
        base_url = urls['mcp'].get(mcp_type)
    elif service_name == "agent":  # Changed from agent_orchestrator to agent
        if 'agent' not in urls:
            logger.warning("Agent URL not found in configuration")
            services_status[service_name] = {
                "status": "unknown",
                "last_checked": datetime.now().isoformat(),
                "message": "Agent URL not configured"
            }
            return
        base_url = urls['agent']['internal_url']
    else:
        # Handle main services
        if service_name not in urls:
            logger.warning(f"URL for {service_name} not found in configuration")
            services_status[service_name] = {
                "status": "unknown",
                "last_checked": datetime.now().isoformat(),
                "message": "Service URL not configured"
            }
            return
        base_url = urls[service_name]['internal_url']

    # Use health endpoint only for agent (journey mapper uses root endpoint)
    if service_name == "agent":
        url = f"{base_url}/health"
    else:
        url = base_url

    logger.info(f"Checking service {service_name} at URL: {url}")

    try:
        # Do a DNS lookup first to check for hostname issues
        hostname = url.split("://")[1].split(":")[0]
        if hostname != "localhost" and not hostname.startswith("127.0."):
            try:
                # Try to import socket
                import socket
                try:
                    socket.gethostbyname(hostname)
                except socket.gaierror:
                    logger.error(f"Cannot resolve hostname: {hostname}")
                    services_status[service_name] = {
                        "status": "offline",
                        "last_checked": datetime.now().isoformat(),
                        "message": f"DNS resolution failed for {hostname}"
                    }
                    return
            except ImportError:
                # If we can't import socket, skip the DNS check
                pass

        # Now try the actual HTTP request
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            status = "running"
            message = "Service is running"
        else:
            status = "error"
            message = f"Error: HTTP {response.status_code}"
    except requests.exceptions.RequestException as e:
        logger.warning(f"Service {service_name} check failed: {str(e)}")
        status = "offline"
        message = str(e)

    # Update status cache
    services_status[service_name] = {
        "status": status,
        "last_checked": datetime.now().isoformat(),
        "message": message if 'message' in locals() else "Status check completed"
    }

def update_all_services():
    """Update status of all services"""
    check_service("journey_mapper")
    check_service("reddit_ripper")
    check_service("social_research")
    check_service("video_analyzer")
    check_service("miro_generator")
    check_service("consistent_character_generator")
    check_service("research_generator")
    check_service("copilot_recipe_generator")

    # Check agent services if enabled
    if os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true':
        check_service("reddit_mcp")
        check_service("social_mcp")
        check_service("journey_mcp")
        check_service("claude4_journey_mcp")
        check_service("video_mcp")
        check_service("research_mcp")
        check_service("agent")  # Changed from agent_orchestrator to agent

# Background service checker thread
def service_checker():
    while True:
        update_all_services()
        time.sleep(10)  # Check every 10 seconds

# Start background thread for service checking
service_checker_thread = threading.Thread(target=service_checker)
service_checker_thread.daemon = True
service_checker_thread.start()

# Create the main dictionary to store WebSocket connections
websocket_connections = {}

# WebSocket functions
def run_async(func):
    """Decorator to run an async function in the current thread's event loop"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(func(*args, **kwargs))
        finally:
            loop.close()
    return wrapper

@app.route('/')
def index():
    """Main launchpad page"""
    # Ensure status is updated before rendering
    update_all_services()

    # Detect if request is secure (HTTPS) with debugging
    request_is_secure = request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'
    
    # Debug logging to see what's happening
    logger.info(f"[URL DEBUG] Request URL: {request.url}")
    logger.info(f"[URL DEBUG] Request scheme: {request.scheme}")
    logger.info(f"[URL DEBUG] request.is_secure: {request.is_secure}")
    logger.info(f"[URL DEBUG] X-Forwarded-Proto header: {request.headers.get('X-Forwarded-Proto')}")
    logger.info(f"[URL DEBUG] Final request_is_secure: {request_is_secure}")

    # Get dynamic URLs for client with protocol detection
    urls = get_dynamic_urls(request_is_secure=request_is_secure)

    # Get current service statuses
    service_statuses = {
        'journey_mapper': services_status['journey_mapper']['status'],
        # 'claude4_journey_mapper' removed
        'reddit_ripper': services_status['reddit_ripper']['status'],
        'social_research': services_status['social_research']['status'],
        'video_analyzer': services_status['video_analyzer']['status'],
        'miro_generator': services_status['miro_generator']['status'],
        'consistent_character_generator': services_status['consistent_character_generator']['status'],
        'research_generator': services_status['research_generator']['status'],
        'copilot_recipe_generator': services_status['copilot_recipe_generator']['status']
    }

    # Determine if CX agent is enabled
    cx_agent_enabled = os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true'

    # Use enhanced template for better visibility
    import time
    return render_template('index.html',
                       journey_mapper_url=urls['journey_mapper']['client_url'],
                       reddit_ripper_url=urls['reddit_ripper']['client_url'],
                       social_research_url=urls['social_research']['client_url'],
                       video_analyzer_url=urls['video_analyzer']['client_url'],
                       miro_generator_url=urls['miro_generator']['client_url'],
                       consistent_character_generator_url=urls['consistent_character_generator']['client_url'],
                       research_generator_url=urls['research_generator']['client_url'],
                       copilot_recipe_generator_url=urls['copilot_recipe_generator']['client_url'],
                       service_statuses=service_statuses,
                       enable_agent=cx_agent_enabled,
                       timestamp=int(time.time()))

@app.route('/agent')
def agent_page():
    """Agent interface page - redirect to MCP chatbot"""
    return redirect(url_for('mcp_chat_page'))

@app.route('/mcp-chat')
def mcp_chat_page():
    """MCP-compliant chatbot interface"""
    return render_template('mcp_chatbot.html')

@app.route('/status')
def status_page():
    """Status page showing service health"""
    # Ensure status is updated before rendering
    update_all_services()

    # Detect if request is secure (HTTPS)
    request_is_secure = request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'

    # Get dynamic URLs for client with protocol detection
    urls = get_dynamic_urls(request_is_secure=request_is_secure)

    # Get current service statuses
    service_statuses = {
        'journey_mapper': services_status['journey_mapper']['status'],
        # 'claude4_journey_mapper' removed
        'reddit_ripper': services_status['reddit_ripper']['status'],
        'social_research': services_status['social_research']['status'],
        'video_analyzer': services_status['video_analyzer']['status'],
        'miro_generator': services_status['miro_generator']['status']
    }

    # Determine if CX agent is enabled for template
    cx_agent_enabled = os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true'

    # Use the enhanced status template with monitoring capabilities
    return render_template('status-enhanced.html',
                          services_status=services_status,
                          service_urls=urls,
                          service_statuses=service_statuses,
                          enable_agent=cx_agent_enabled)

@app.route('/api/status')
def status():
    """API endpoint to get service status"""
    # Detect if request is secure (HTTPS)
    request_is_secure = request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'
    
    return jsonify({
        "services": services_status,
        "urls": get_dynamic_urls(request_is_secure=request_is_secure)
    })

@app.route('/redirect/<service>')
def redirect_to_service(service):
    """Redirect to a specific service"""
    # Detect if request is secure (HTTPS)
    request_is_secure = request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'
    
    urls = get_dynamic_urls(request_is_secure=request_is_secure)

    if service in urls:
        return redirect(urls[service]['client_url'])
    else:
        return redirect(url_for('index'))

@app.route('/api/urls')
def get_urls():
    """Return the URLs for all services"""
    # Detect if request is secure (HTTPS)
    request_is_secure = request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https'
    
    urls = get_dynamic_urls(request_is_secure=request_is_secure)

    # Extract ports from URLs for display
    def extract_port(url):
        if ":" in url.split("/")[-1]:
            return url.split(":")[-1].split("/")[0]
        return "80" if url.startswith("http://") else "443"

    result = {
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
        'video_analyzer': {
            'url': urls['video_analyzer']['client_url'],
            'port': extract_port(urls['video_analyzer']['client_url'])
        },
        'launchpad': {
            'url': request.url_root.rstrip('/'),  # Use the current request URL root
            'port': extract_port(request.url_root)
        }
    }

    # Add agent URL if enabled
    if os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true' and 'agent' in urls:
        result['agent'] = {
            'url': urls['agent']['client_url'],
            'port': extract_port(urls['agent']['client_url'])
        }

    return jsonify(result)

# Agent API endpoints - only enabled if CX Agent is enabled and flask_sock is available
if has_flask_sock and os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true':
    # API endpoint for creating a chat conversation - Proxy to agent
    @app.route('/api/chat/conversation', methods=['POST'])
    def create_conversation():
        """Proxy chat conversation creation to agent service"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'agent' not in urls:
            return jsonify({"error": "Agent not configured"}), 404
        
        target_url = f"{urls['agent']['internal_url']}/api/chat/conversation"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    # API endpoint for sending chat messages - Proxy to agent
    @app.route('/api/chat/message', methods=['POST'])
    def send_chat_message():
        """Proxy chat message to agent service"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'agent' not in urls:
            return jsonify({"error": "Agent not configured"}), 404
        
        target_url = f"{urls['agent']['internal_url']}/api/chat/message"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    # API endpoint for model management - Proxy to agent
    @app.route('/api/chat/model', methods=['POST'])
    def set_chat_model():
        """Proxy model setting to agent service"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'agent' not in urls:
            return jsonify({"error": "Agent not configured"}), 404
        
        target_url = f"{urls['agent']['internal_url']}/api/chat/model"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    # API endpoint for getting available models - Proxy to agent
    @app.route('/api/chat/models', methods=['GET'])
    def get_chat_models():
        """Proxy models list to agent service"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'agent' not in urls:
            return jsonify({"error": "Agent not configured"}), 404
        
        target_url = f"{urls['agent']['internal_url']}/api/chat/models"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    # WebSocket API endpoint for agent messages - DEPRECATED
    @app.route('/api/chat/ws/<conversation_id>')
    def agent_websocket_url(conversation_id):
        """DEPRECATED: Redirect to MCP chatbot"""
        return jsonify({
            "error": "Old WebSocket agent is deprecated. Please use the new MCP chatbot.",
            "redirect": "/mcp-chat"
        }), 302

    # WebSocket proxy to the agent
    @sock.route('/ws-proxy/<conversation_id>')
    def ws_proxy(ws, conversation_id):
        """WebSocket proxy that forwards messages between client and agent"""
        # Store active connections
        conn_id = str(uuid.uuid4())
        agent_ws = None
        logger.info(f"WebSocket proxy connection established: {conn_id}")
        
        # Get correct agent URL
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        agent_ws_url = urls['agent']['ws_url'] if 'agent' in urls else None

        # Check agent service status
        agent_status = services_status.get('agent', {}).get('status', 'unknown')
        if agent_status != 'running':
            logger.error(f"Agent service is not running (status: {agent_status})")
            ws.send(json.dumps({
                "type": "error",
                "content": f"Agent service is not running. Current status: {agent_status}. Please start the agent service."
            }))
            return

        if not agent_ws_url:
            logger.error(f"Agent WebSocket URL not configured")
            ws.send(json.dumps({
                "type": "error",
                "content": "Agent service not configured properly"
            }))
            return

        agent_ws_url = f"{agent_ws_url}/ws/{conversation_id}"
        logger.info(f"Connecting to agent at: {agent_ws_url}")
        
        # Send initial status to client
        try:
            ws.send(json.dumps({
                "type": "status",
                "status": "connecting",
                "message": "Connecting to agent service..."
            }))
        except Exception as e:
            logger.error(f"Error sending initial status: {e}")
        
        # Event for signaling thread termination
        shutdown_event = threading.Event()
        
        # Define the async processing function
        async def handle_websocket_proxy():
            nonlocal agent_ws
            
            # Connection attempt with retry
            retry_count = 0
            max_retries = 3
            retry_delay = 1
            
            while retry_count < max_retries and not shutdown_event.is_set():
                try:
                    # Connect with explicit settings for reliability
                    agent_ws = await websockets.connect(
                        agent_ws_url,
                        ping_interval=20,  # Send ping every 20 seconds
                        ping_timeout=10,   # Wait 10 seconds for pong
                        close_timeout=5,   # Wait 5 seconds for close frame
                        max_size=10485760, # 10MB message size limit
                        compression=None   # Disable compression for compatibility
                    )
                    
                    logger.info(f"Connected to agent WebSocket: {agent_ws_url}")
                    
                    # Send success notification to client
                    try:
                        ws.send(json.dumps({
                            "type": "status",
                            "status": "connected",
                            "message": "Connected to agent service"
                        }))
                    except Exception as e:
                        logger.error(f"Error sending connection status: {e}")
                    
                    # Process messages in both directions
                    await asyncio.gather(
                        forward_agent_to_client(agent_ws, ws, shutdown_event),
                        forward_client_to_agent(ws, agent_ws, shutdown_event)
                    )
                    
                    break  # Exit retry loop if connection succeeds
                    
                except (websockets.exceptions.InvalidStatusCode, 
                        websockets.exceptions.InvalidHandshake) as e:
                    # These errors indicate agent is running but WebSocket endpoint is invalid
                    logger.error(f"Agent WebSocket handshake failed: {e}")
                    try:
                        ws.send(json.dumps({
                            "type": "error",
                            "content": f"Agent service endpoint error: {e}"
                        }))
                    except:
                        pass
                    break  # Don't retry for these errors
                    
                except (websockets.exceptions.WebSocketException, 
                        ConnectionRefusedError, OSError) as e:
                    # Potentially recoverable network errors
                    retry_count += 1
                    logger.warning(f"Connection attempt {retry_count} failed: {e}")
                    
                    if retry_count < max_retries:
                        # Notify client about retry
                        try:
                            ws.send(json.dumps({
                                "type": "status",
                                "status": "reconnecting",
                                "message": f"Connection failed. Retrying in {retry_delay}s..."
                            }))
                        except:
                            pass
                        
                        # Wait before retrying
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        # All retries failed
                        logger.error(f"Failed to connect to agent after {max_retries} attempts")
                        try:
                            ws.send(json.dumps({
                                "type": "error",
                                "content": "Cannot connect to agent service. Please try again later."
                            }))
                        except:
                            pass
                
                except Exception as e:
                    # Unexpected errors
                    logger.error(f"Unexpected error connecting to agent: {e}", exc_info=True)
                    try:
                        ws.send(json.dumps({
                            "type": "error",
                            "content": f"Unexpected error: {str(e)}"
                        }))
                    except:
                        pass
                    break
        
        # Forward messages from agent to client
        async def forward_agent_to_client(agent_ws, client_ws, shutdown_event):
            try:
                while not shutdown_event.is_set():
                    try:
                        # Use wait_for to prevent blocking indefinitely
                        message = await asyncio.wait_for(agent_ws.recv(), timeout=0.5)
                        logger.debug(f"Agent → Client: {message[:100]}...")
                        client_ws.send(message)
                    except asyncio.TimeoutError:
                        # This is expected, just check shutdown_event and continue
                        continue
                    except websockets.exceptions.ConnectionClosed:
                        logger.warning("Agent connection closed")
                        try:
                            client_ws.send(json.dumps({
                                "type": "status",
                                "status": "disconnected",
                                "message": "Agent service disconnected"
                            }))
                        except:
                            pass
                        break
            except Exception as e:
                logger.error(f"Error in agent→client forwarding: {e}", exc_info=True)
            finally:
                shutdown_event.set()  # Signal to stop the other forwarding task
        
        # Forward messages from client to agent
        async def forward_client_to_agent(client_ws, agent_ws, shutdown_event):
            try:
                while not shutdown_event.is_set():
                    try:
                        # Non-blocking receive with timeout
                        message = client_ws.receive(timeout=0.5)
                        if message:
                            logger.debug(f"Client → Agent: {message[:100]}...")
                            await agent_ws.send(message)
                    except Exception as e:
                        if "WebSocket is already closed" in str(e):
                            logger.warning("Client WebSocket closed")
                            break
                        elif "Timed out" not in str(e):
                            # Ignore timeout errors as they're expected
                            logger.error(f"Error receiving from client: {e}")
                            break
            except Exception as e:
                logger.error(f"Error in client→agent forwarding: {e}", exc_info=True)
            finally:
                shutdown_event.set()  # Signal to stop the other forwarding task
        
        # Run the async function in a thread
        def run_async_proxy():
            # Create an event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                # Run the proxy handler
                loop.run_until_complete(handle_websocket_proxy())
            finally:
                # Clean up
                loop.close()
                if agent_ws and not agent_ws.closed:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(agent_ws.close())
                    loop.close()
                
                logger.info(f"WebSocket proxy connection closed: {conn_id}")
        
        # Start the proxy in a separate thread
        proxy_thread = threading.Thread(target=run_async_proxy)
        proxy_thread.daemon = True
        proxy_thread.start()
        
        # Keep the client WebSocket open
        try:
            while ws.connected:
                time.sleep(0.1)
        except Exception as e:
            logger.error(f"Error in client WebSocket: {e}")
        finally:
            # Clean up resources
            shutdown_event.set()
            logger.info(f"Client WebSocket disconnected: {conn_id}")
            
            # Give the proxy thread a moment to clean up
            proxy_thread.join(timeout=2.0)

    # MCP Server Proxy functions
    def proxy_request(target_url, method, headers, data, params=None):
        """Proxy a request to a target URL"""
        try:
            # Forward the request
            resp = requests.request(
                method=method,
                url=target_url,
                headers={key: value for (key, value) in headers.items() if key.lower() != 'host'},
                data=data,
                params=params
            )

            # Create response
            response = Response(
                resp.content,
                resp.status_code,
                dict(resp.headers)
            )
            return response
        except Exception as e:
            logger.error(f"Error proxying request: {str(e)}")
            return jsonify({"error": f"Error proxying request: {str(e)}"}), 500

    @app.route('/proxy/agent/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_agent(path):
        """Proxy requests to the agent server"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'agent' not in urls:
            return jsonify({"error": "Agent not configured"}), 404

        target_url = f"{urls['agent']['internal_url']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    @app.route('/proxy/reddit-mcp/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_reddit_mcp(path):
        """Proxy requests to the Reddit MCP server"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'mcp' not in urls or 'reddit' not in urls['mcp']:
            return jsonify({"error": "Reddit MCP not configured"}), 404

        target_url = f"{urls['mcp']['reddit']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    @app.route('/proxy/social-mcp/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_social_mcp(path):
        """Proxy requests to the Social MCP server"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'mcp' not in urls or 'social' not in urls['mcp']:
            return jsonify({"error": "Social MCP not configured"}), 404

        target_url = f"{urls['mcp']['social']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    @app.route('/proxy/journey-mcp/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_journey_mcp(path):
        """Proxy requests to the Journey MCP server"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'mcp' not in urls or 'journey' not in urls['mcp']:
            return jsonify({"error": "Journey MCP not configured"}), 404

        target_url = f"{urls['mcp']['journey']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)
        
    @app.route('/proxy/video-mcp/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_video_mcp(path):
        """Proxy requests to the Video MCP server"""
        urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
        if 'mcp' not in urls or 'video' not in urls['mcp']:
            return jsonify({"error": "Video MCP not configured"}), 404

        target_url = f"{urls['mcp']['video']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

# MCP Chatbot Endpoints - Proxy to Agent Service
@app.route('/api/mcp/conversation', methods=['POST'])
def create_mcp_conversation():
    """Create a new MCP conversation via agent service"""
    urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
    if 'agent' not in urls:
        return jsonify({"error": "Agent service not configured"}), 500
    
    # Check if agent service is running
    agent_status = services_status.get('agent', {}).get('status', 'unknown')
    if agent_status != 'running':
        return jsonify({"error": f"Agent service is not running. Status: {agent_status}"}), 503
    
    try:
        # Proxy the request to the agent service
        target_url = f"{urls['agent']['internal_url']}/api/chat/conversation"
        
        response = requests.post(
            target_url,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            logger.error(f"Agent service returned error: {response.status_code} - {response.text}")
            return jsonify({"error": f"Agent service error: {response.text}"}), response.status_code
            
    except Exception as e:
        logger.error(f"Error creating MCP conversation: {str(e)}")
        return jsonify({"error": f"Failed to connect to agent service: {str(e)}"}), 500

@app.route('/api/mcp/message', methods=['POST'])
def send_mcp_message():
    """Send a message to the MCP chatbot via agent service"""
    urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
    if 'agent' not in urls:
        return jsonify({"error": "Agent service not configured"}), 500
    
    # Check if agent service is running
    agent_status = services_status.get('agent', {}).get('status', 'unknown')
    if agent_status != 'running':
        return jsonify({"error": f"Agent service is not running. Status: {agent_status}"}), 503
    
    try:
        # Debug: Log what we're receiving from the browser
        logger.info(f"[LAUNCHPAD DEBUG] === FILE UPLOAD DEBUG START ===")
        logger.info(f"[LAUNCHPAD DEBUG] Received form data: {dict(request.form)}")
        logger.info(f"[LAUNCHPAD DEBUG] Files in request: {list(request.files.keys())}")
        
        if request.files:
            for key, file in request.files.items():
                try:
                    # Read file content to check actual size
                    file.seek(0)  # Go to beginning
                    content = file.read()
                    file.seek(0)  # Reset for forwarding
                    actual_size = len(content)
                    logger.info(f"[LAUNCHPAD DEBUG] File '{key}': filename='{file.filename}', content_type='{file.content_type}', reported_size={file.content_length}, actual_size={actual_size}")
                    
                    if actual_size == 0:
                        logger.error(f"[LAUNCHPAD DEBUG] *** ZERO BYTE FILE DETECTED *** File '{file.filename}' has no content!")
                    else:
                        logger.info(f"[LAUNCHPAD DEBUG] File '{file.filename}' has {actual_size} bytes of content - GOOD!")
                        
                    # Log first few bytes for debugging
                    if actual_size > 0:
                        preview = content[:50] if len(content) > 50 else content
                        logger.info(f"[LAUNCHPAD DEBUG] First 50 bytes: {preview}")
                        
                except Exception as e:
                    logger.error(f"[LAUNCHPAD DEBUG] Error reading file '{key}': {str(e)}")
        else:
            logger.info(f"[LAUNCHPAD DEBUG] No files in request")
            
        logger.info(f"[LAUNCHPAD DEBUG] === FILE UPLOAD DEBUG END ===")
        
        # Proxy the request to the agent service
        target_url = f"{urls['agent']['internal_url']}/api/chat/message"
        
        # Check if this is a video transcription request for longer timeout
        message_content = request.form.get('message', '').lower()
        is_video_request = 'youtube.com' in message_content or 'transcribe' in message_content
        
        # Use appropriate timeout based on request type
        timeout = 300 if is_video_request else 60  # 5 minutes for video, 1 minute for others
        
        # Properly reconstruct files for forwarding
        files_to_forward = {}
        if request.files:
            for key, file in request.files.items():
                # Read the file content
                file.seek(0)
                file_content = file.read()
                file.seek(0)  # Reset for any further use
                
                # Create a tuple with filename, content, and content_type for requests
                files_to_forward[key] = (file.filename, file_content, file.content_type)
                logger.info(f"[LAUNCHPAD DEBUG] Forwarding file: {key} -> filename='{file.filename}', content_type='{file.content_type}', size={len(file_content)}")
        
        # Forward the form data to the agent service
        response = requests.post(
            target_url,
            data=request.form,
            files=files_to_forward,
            timeout=timeout
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            logger.error(f"Agent service returned error: {response.status_code} - {response.text}")
            return jsonify({"error": f"Agent service error: {response.text}"}), response.status_code
            
    except Exception as e:
        logger.error(f"Error processing MCP message: {str(e)}")
        return jsonify({"error": f"Failed to connect to agent service: {str(e)}"}), 500

@app.route('/api/mcp/servers')
def get_mcp_servers():
    """Get MCP server status"""
    urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
    server_status = {}
    
    # Define MCP servers
    mcp_servers = {
        "reddit": {
            "url": urls.get('mcp', {}).get('reddit', 'http://reddit-mcp:8501'),
            "description": "Reddit data collection and analysis tools"
        },
        "social": {
            "url": urls.get('mcp', {}).get('social', 'http://social-mcp:8502'),
            "description": "Social media research and sentiment analysis tools"
        },
        "journey": {
            "url": urls.get('mcp', {}).get('journey', 'http://journey-mcp:8503'),
            "description": "Customer journey mapping with Claude 3.7 Sonnet"
        },
        "video": {
            "url": urls.get('mcp', {}).get('video', 'http://video-mcp:8504'),
            "description": "Video transcription and analysis tools"
        },
        "claude4_journey": {
            "url": urls.get('mcp', {}).get('claude4_journey', 'http://claude4-journey-mcp:8506'),
            "description": "Advanced customer journey mapping with Claude Sonnet 4"
        },
        "research": {
            "url": urls.get('mcp', {}).get('research', 'http://research-mcp:8507'),
            "description": "Research analysis and persona generation with Gemini 3 Pro"
        }
    }
    
    for server_name, server_config in mcp_servers.items():
        try:
            response = requests.get(f"{server_config['url']}/health", timeout=5)
            if response.status_code == 200:
                server_status[server_name] = {
                    "status": "online",
                    "url": server_config['url'],
                    "description": server_config['description']
                }
            else:
                server_status[server_name] = {
                    "status": "error",
                    "url": server_config['url'],
                    "description": server_config['description'],
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            server_status[server_name] = {
                "status": "offline",
                "url": server_config['url'],
                "description": server_config['description'],
                "error": str(e)
            }
    
    return jsonify({"servers": server_status})

def get_mcp_tools():
    """Get available tools from all MCP servers"""
    urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
    all_tools = []
    
    mcp_servers = {
        "reddit": urls.get('mcp', {}).get('reddit', 'http://reddit-mcp:8501'),
        "social": urls.get('mcp', {}).get('social', 'http://social-mcp:8502'),
        "journey": urls.get('mcp', {}).get('journey', 'http://journey-mcp:8503'),
        "video": urls.get('mcp', {}).get('video', 'http://video-mcp:8504'),
        "claude4_journey": urls.get('mcp', {}).get('claude4_journey', 'http://claude4-journey-mcp:8506'),
        "research": urls.get('mcp', {}).get('research', 'http://research-mcp:8507')
    }
    
    for server_name, server_url in mcp_servers.items():
        try:
            response = requests.get(f"{server_url}/mcp/tools", timeout=5)
            
            if response.status_code == 200:
                tools = response.json()
                
                # Convert MCP tool specs to Claude tool format
                for tool in tools:
                    claude_tool = {
                        "name": tool.get("name"),
                        "description": tool.get("description"),
                        "input_schema": tool.get("parameters", {
                            "type": "object",
                            "properties": {},
                            "required": []
                        })
                    }
                    all_tools.append(claude_tool)
                    
                logger.info(f"Loaded {len(tools)} tools from {server_name}")
            else:
                logger.warning(f"Failed to load tools from {server_name}: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error loading tools from {server_name}: {str(e)}")
    
    logger.info(f"Total MCP tools available: {len(all_tools)}")
    return all_tools

def execute_mcp_tool(tool_name, parameters):
    """Execute a tool call via the appropriate MCP server"""
    urls = get_dynamic_urls(request_is_secure=False)  # Use HTTP for internal communication
    
    mcp_servers = {
        "reddit": urls.get('mcp', {}).get('reddit', 'http://reddit-mcp:8501'),
        "social": urls.get('mcp', {}).get('social', 'http://social-mcp:8502'),
        "journey": urls.get('mcp', {}).get('journey', 'http://journey-mcp:8503'),
        "video": urls.get('mcp', {}).get('video', 'http://video-mcp:8504'),
        "claude4_journey": urls.get('mcp', {}).get('claude4_journey', 'http://claude4-journey-mcp:8506'),
        "research": urls.get('mcp', {}).get('research', 'http://research-mcp:8507')
    }
    
    # Find which server handles this tool
    server_url = None
    for server_name, url in mcp_servers.items():
        try:
            # Check if this server has the tool
            response = requests.get(f"{url}/mcp/tools", timeout=5)
            if response.status_code == 200:
                tools = response.json()
                if any(tool.get("name") == tool_name for tool in tools):
                    server_url = url
                    break
        except Exception as e:
            logger.warning(f"Error checking tools for {server_name}: {str(e)}")
    
    if not server_url:
        return {"error": f"Tool '{tool_name}' not found in any MCP server"}
    
    # Execute the tool
    try:
        tool_url = f"{server_url}/mcp/invoke/{tool_name}"
        
        # Convert parameters to form data for FastAPI compatibility
        if any(isinstance(v, (dict, list)) for v in parameters.values()):
            # If there are complex parameters, use JSON
            response = requests.post(tool_url, json=parameters, timeout=30)
        else:
            # Use form data for simple parameters
            response = requests.post(tool_url, data=parameters, timeout=30)
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Tool execution failed: {response.status_code} - {response.text}")
            return {"error": f"Tool execution failed: {response.text}"}
            
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return {"error": f"Error executing tool: {str(e)}"}

# API endpoint for service logs
@app.route('/api/logs')
def get_logs():
    """API endpoint to get service logs"""
    service = request.args.get('service', 'all')
    lines = request.args.get('lines', 100, type=int)
    
    logs = []
    
    try:
        # Map service name to container name
        service_to_container = {
            'journey-mapper': 'journey-mapper',
            'reddit-ripper': 'reddit-ripper',
            'social-research': 'social-research-frontend',
            'video-analyzer': 'video-analyzer',
            'agent': 'agent',
            'reddit-mcp': 'reddit-mcp',
            'social-mcp': 'social-mcp',
            'journey-mcp': 'journey-mcp',
            'video-mcp': 'video-mcp'
        }
        
        # If requesting all services, get logs from all containers
        if service == 'all':
            for container in service_to_container.values():
                try:
                    container_logs = get_docker_logs(container, lines)
                    logs.extend([f"[{container}] {line}" for line in container_logs])
                except Exception as e:
                    logs.append(f"ERROR: Failed to get logs for {container}: {str(e)}")
        # Otherwise get logs for the specific service
        elif service in service_to_container:
            container = service_to_container[service]
            logs = get_docker_logs(container, lines)
        else:
            logs = [f"ERROR: Unknown service '{service}'"] 
            
        # Sort logs by timestamp (if possible)
        # This is a simple approach - actual timestamp parsing would be more complex
        logs.sort(reverse=True)
        
        return jsonify({
            'service': service,
            'logs': logs[:lines]  # Limit to requested number of lines
        })
    except Exception as e:
        logger.error(f"Error getting logs: {str(e)}", exc_info=True)
        return jsonify({
            'service': service,
            'error': str(e),
            'logs': [f"ERROR: Failed to get logs: {str(e)}"]
        })

# API endpoint for performance metrics
@app.route('/api/metrics')
def get_metrics():
    """API endpoint to get system metrics"""
    try:
        # Get system metrics
        system_metrics = get_system_metrics()
        
        # Get container metrics
        container_metrics = get_container_metrics()
        
        # Combine metrics
        metrics = {
            **system_metrics,
            'containers': container_metrics
        }
        
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'cpu_usage': None,
            'memory_usage': None,
            'disk_usage': None,
            'containers': []
        })

# Helper function to get Docker logs
def get_docker_logs(container_name, lines=100):
    """Get logs from a Docker container"""
    try:
        # Run docker logs command
        result = subprocess.run(
            ['docker', 'logs', '--tail', str(lines), container_name],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        # Check if command was successful
        if result.returncode == 0:
            # Split logs into lines and filter out empty lines
            logs = [line for line in result.stdout.split('\n') if line.strip()]
            return logs
        else:
            # Return error message if command failed
            return [f"ERROR: {result.stderr}"]
    except subprocess.TimeoutExpired:
        return ["ERROR: Docker logs command timed out"]
    except Exception as e:
        return [f"ERROR: {str(e)}"]

# Helper function to get system metrics
def get_system_metrics():
    """Get system metrics like CPU, memory, and disk usage"""
    try:
        # Get CPU usage
        cpu_usage = psutil.cpu_percent(interval=0.5)
        
        # Get memory usage
        memory = psutil.virtual_memory()
        memory_usage = f"{memory.percent}% ({format_bytes(memory.used)} / {format_bytes(memory.total)})"
        
        # Get disk usage
        disk = psutil.disk_usage('/')
        disk_usage = disk.percent
        
        # Mock API requests metrics (would be replaced with actual tracking)
        api_requests = 1250  # Example value
        
        # Mock changes (would be calculated from historical data)
        cpu_change = 2.5  # Example: 2.5% increase
        memory_change = -1.3  # Example: 1.3% decrease
        disk_change = 0.8  # Example: 0.8% increase
        api_requests_change = 15.2  # Example: 15.2% increase
        
        return {
            'cpu_usage': cpu_usage,
            'memory_usage': memory_usage,
            'disk_usage': disk_usage,
            'api_requests': api_requests,
            'cpu_change': cpu_change,
            'memory_change': memory_change,
            'disk_change': disk_change,
            'api_requests_change': api_requests_change
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}", exc_info=True)
        return {
            'cpu_usage': None,
            'memory_usage': None,
            'disk_usage': None,
            'api_requests': None
        }

# Helper function to get container metrics
def get_container_metrics():
    """Get metrics for Docker containers"""
    try:
        # Run docker stats command to get container metrics
        result = subprocess.run(
            ['docker', 'stats', '--no-stream', '--format', '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        # Parse container stats
        containers = []
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                if not line.strip():
                    continue
                    
                parts = line.split('|')
                if len(parts) >= 3:
                    name = parts[0]
                    cpu = parts[1].strip()
                    memory = parts[2].strip()
                    
                    containers.append({
                        'name': name,
                        'cpu': cpu,
                        'memory': memory
                    })
        
        return containers
    except Exception as e:
        logger.error(f"Error getting container metrics: {str(e)}", exc_info=True)
        return []

# Helper function to format bytes
def format_bytes(bytes):
    """Format bytes to human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes < 1024:
            return f"{bytes:.2f} {unit}"
        bytes /= 1024
    return f"{bytes:.2f} PB"

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=True, host='0.0.0.0', port=port)