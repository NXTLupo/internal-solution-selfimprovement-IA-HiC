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

# Parse URLs from environment variables
def get_dynamic_urls():
    # Internal URLs for service checks (container to container)
    journey_mapper_url = os.environ.get('JOURNEY_MAPPER_URL', 'http://journey-mapper:8000')
    reddit_ripper_url = os.environ.get('REDDIT_RIPPER_URL', 'http://reddit-ripper:5000')
    social_research_url = os.environ.get('SOCIAL_RESEARCH_URL', 'http://social-research-frontend:3000')

    # CX Agent and MCP servers (optional)
    reddit_mcp_url = os.environ.get('REDDIT_MCP_URL', 'http://reddit-mcp:8501')
    social_mcp_url = os.environ.get('SOCIAL_MCP_URL', 'http://social-mcp:8502')
    journey_mcp_url = os.environ.get('JOURNEY_MCP_URL', 'http://journey-mcp:8503')
    # Using 'agent' hostname as configured in docker-compose-agent.yml
    agent_url = os.environ.get('AGENT_URL', 'http://agent:8500')
    agent_ws_url = os.environ.get('AGENT_WS_URL', 'ws://agent:8500')
    agent_client_url = os.environ.get('AGENT_CLIENT_URL', 'http://localhost:8090')

    # External URLs for client browsers
    journey_mapper_client_url = os.environ.get('JOURNEY_MAPPER_CLIENT_URL', 'http://localhost:8080')
    reddit_ripper_client_url = os.environ.get('REDDIT_RIPPER_CLIENT_URL', 'http://localhost:5001')
    social_research_client_url = os.environ.get('SOCIAL_RESEARCH_CLIENT_URL', 'http://localhost:3000')

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
        }
    }

    # Add agent and MCP URLs if CX agent is enabled
    if os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true':
        urls.update({
            'mcp': {
                'reddit': reddit_mcp_url,
                'social': social_mcp_url,
                'journey': journey_mcp_url
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
    "social_research": {"status": "unknown", "last_checked": None}
}

# Add agent services if enabled
if os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true':
    services_status.update({
        "reddit_mcp": {"status": "unknown", "last_checked": None},
        "social_mcp": {"status": "unknown", "last_checked": None},
        "journey_mcp": {"status": "unknown", "last_checked": None},
        "agent": {"status": "unknown", "last_checked": None}  # Changed from agent_orchestrator to agent
    })

def check_service(service_name):
    """Check if a service is running by making a request to its URL"""
    urls = get_dynamic_urls()

    # Skip checking MCP and agent services if CX agent is disabled
    if service_name in ["reddit_mcp", "social_mcp", "journey_mcp", "agent"] and \
       os.environ.get('ENABLE_CX_AGENT', 'false').lower() != 'true':
        return

    # Get base URL for the service
    if service_name in ["reddit_mcp", "social_mcp", "journey_mcp"]:
        # Handle MCP servers
        mcp_type = service_name.split('_')[0]  # Extract reddit, social, journey
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

    # Use health endpoint for journey mapper
    if service_name == "journey_mapper":
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

    # Check agent services if enabled
    if os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true':
        check_service("reddit_mcp")
        check_service("social_mcp")
        check_service("journey_mcp")
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

    # Get dynamic URLs for client
    urls = get_dynamic_urls()

    # Get current service statuses
    service_statuses = {
        'journey_mapper': services_status['journey_mapper']['status'],
        'reddit_ripper': services_status['reddit_ripper']['status'],
        'social_research': services_status['social_research']['status']
    }

    # Determine if CX agent is enabled
    cx_agent_enabled = os.environ.get('ENABLE_CX_AGENT', 'false').lower() == 'true'

    # Always use the enhanced template - it provides better visibility of all services
    return render_template('enhanced-index.html',
                       journey_mapper_url=urls['journey_mapper']['client_url'],
                       reddit_ripper_url=urls['reddit_ripper']['client_url'],
                       social_research_url=urls['social_research']['client_url'],
                       service_statuses=service_statuses)

@app.route('/agent')
def agent_page():
    """Agent interface page"""
    if os.environ.get('ENABLE_CX_AGENT', 'false').lower() != 'true':
        return redirect(url_for('index'))

    urls = get_dynamic_urls()
    if 'agent' in urls:
        return render_template('agent-embed.html', agent_url=urls['agent']['client_url'])
    else:
        return redirect(url_for('index'))

@app.route('/status')
def status_page():
    """Status page showing service health"""
    # Ensure status is updated before rendering
    update_all_services()

    # Get dynamic URLs for client
    urls = get_dynamic_urls()

    # Get current service statuses
    service_statuses = {
        'journey_mapper': services_status['journey_mapper']['status'],
        'reddit_ripper': services_status['reddit_ripper']['status'],
        'social_research': services_status['social_research']['status']
    }

    return render_template('status.html',
                          services_status=services_status,
                          service_urls=urls,
                          service_statuses=service_statuses)

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
        'launchpad': {
            'url': os.environ.get('LAUNCHPAD_URL', f"http://localhost:{os.environ.get('PORT', 8000)}"),
            'port': os.environ.get('PORT', 8000)
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
    # API endpoint for creating a chat conversation
    @app.route('/api/chat/conversation', methods=['POST'])
    def create_conversation():
        """Create a new agent WebSocket conversation"""
        # Generate a conversation ID
        conversation_id = str(uuid.uuid4())

        # Return the conversation ID
        return jsonify({"conversation_id": conversation_id})

    # WebSocket API endpoint for agent messages
    @app.route('/api/chat/ws/<conversation_id>')
    def agent_websocket_url(conversation_id):
        """WebSocket endpoint for agent communication"""
        # For browser clients, we need to use the public-facing URL
        # The browser connects to our WebSocket proxy
        ws_url = f"/ws-proxy/{conversation_id}" # Simplified URL format

        return jsonify({"ws_url": ws_url})

    # WebSocket proxy to the agent
    @sock.route('/ws-proxy/<conversation_id>')
    def ws_proxy(ws, conversation_id):
        """WebSocket proxy that forwards messages between client and agent"""
        # Store active connections
        conn_id = str(uuid.uuid4())
        agent_ws = None
        logger.info(f"WebSocket proxy connection established: {conn_id}")
        
        # Get correct agent URL
        urls = get_dynamic_urls()
        agent_ws_url = urls['agent']['ws_url'] if 'agent' in urls else None
        
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
        urls = get_dynamic_urls()
        if 'agent' not in urls:
            return jsonify({"error": "Agent not configured"}), 404

        target_url = f"{urls['agent']['internal_url']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    @app.route('/proxy/reddit-mcp/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_reddit_mcp(path):
        """Proxy requests to the Reddit MCP server"""
        urls = get_dynamic_urls()
        if 'mcp' not in urls or 'reddit' not in urls['mcp']:
            return jsonify({"error": "Reddit MCP not configured"}), 404

        target_url = f"{urls['mcp']['reddit']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    @app.route('/proxy/social-mcp/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_social_mcp(path):
        """Proxy requests to the Social MCP server"""
        urls = get_dynamic_urls()
        if 'mcp' not in urls or 'social' not in urls['mcp']:
            return jsonify({"error": "Social MCP not configured"}), 404

        target_url = f"{urls['mcp']['social']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

    @app.route('/proxy/journey-mcp/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
    def proxy_journey_mcp(path):
        """Proxy requests to the Journey MCP server"""
        urls = get_dynamic_urls()
        if 'mcp' not in urls or 'journey' not in urls['mcp']:
            return jsonify({"error": "Journey MCP not configured"}), 404

        target_url = f"{urls['mcp']['journey']}/{path}"
        return proxy_request(target_url, request.method, request.headers, request.get_data(), request.args)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=True, host='0.0.0.0', port=port)