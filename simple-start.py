#!/usr/bin/env python3
"""
Simple Launcher for NXT Humans AI CX Workbench
This script creates a basic web server that redirects to the services.
"""

import os
import sys
import socket
import webbrowser
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
import threading
import time
import signal

# Default ports
DEFAULT_PORTS = {
    "launchpad": 8000,
    "journey_mapper": 8080,
    "reddit_ripper": 5001,
    "social_research": 3000
}

# Colors for terminal output
class Colors:
    GREEN = '\033[0;32m'
    BLUE = '\033[0;34m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color

def print_banner():
    """Print the NXT Humans banner."""
    print(f"{Colors.BLUE}")
    print("  _   ___  _______   _   _ _   _ __  __          _   _  _____ ")
    print(" | \\ | \\ \\/ /_   _| | | | | | | |  \\/  |   /\\   | \\ | |/ ____|")
    print(" |  \\| |\\  /  | |   | |_| | | | | \\  / |  /  \\  |  \\| | (___  ")
    print(" | . ` | /  \\ | |   |  _  | | | | |\\/| | / /\\ \\ | . ` |\\___ \\ ")
    print(" | |\\  |/ /\\ \\| |   | | | | |_| | |  | |/ ____ \\| |\\  |____) |")
    print(" |_| \\_/_/  \\_\\_|   |_| |_|\\___/|_|  |_/_/    \\_\\_| \\_|_____/ ")
    print(f"{Colors.NC}")
    print(f"{Colors.YELLOW}AI Customer Experience Workbench{Colors.NC}")
    print("")

def is_port_in_use(port):
    """Check if a port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def find_available_port(start_port):
    """Find an available port starting from start_port."""
    port = start_port
    while is_port_in_use(port):
        port += 1
        if port > start_port + 100:  # Avoid infinite loop
            return None
    return port

class SimpleHandler(BaseHTTPRequestHandler):
    """Simple HTTP request handler that serves a basic launcher page."""
    
    def log_message(self, format, *args):
        """Silence logging."""
        return
    
    def do_GET(self):
        """Handle GET requests."""
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            html = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NXT Humans | AI CX Workbench</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        background-color: #f4f5f7;
                        color: #333;
                        margin: 0;
                        padding: 20px;
                        line-height: 1.6;
                    }}
                    .container {{
                        max-width: 800px;
                        margin: 0 auto;
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }}
                    header {{
                        text-align: center;
                        margin-bottom: 30px;
                    }}
                    h1 {{
                        color: #05668D;
                        margin: 0;
                    }}
                    .subtitle {{
                        color: #427AA1;
                        font-size: 18px;
                    }}
                    .services {{
                        margin: 30px 0;
                    }}
                    .service {{
                        background: #f0f4f8;
                        padding: 15px;
                        margin-bottom: 15px;
                        border-radius: 6px;
                        border-left: 4px solid #05668D;
                    }}
                    .service h3 {{
                        margin-top: 0;
                        color: #05668D;
                    }}
                    .service p {{
                        margin-bottom: 10px;
                    }}
                    .btn {{
                        display: inline-block;
                        background: #05668D;
                        color: white;
                        padding: 8px 16px;
                        text-decoration: none;
                        border-radius: 4px;
                        font-weight: bold;
                    }}
                    .status {{
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-size: 14px;
                        margin-left: 10px;
                    }}
                    .status.available {{
                        background: #e3fcef;
                        color: #0e9f6e;
                        border: 1px solid #0e9f6e;
                    }}
                    .status.unavailable {{
                        background: #fdf2f2;
                        color: #f05252;
                        border: 1px solid #f05252;
                    }}
                    .note {{
                        background: #fffbeb;
                        padding: 15px;
                        border-radius: 6px;
                        border-left: 4px solid #d69e2e;
                        margin-bottom: 20px;
                    }}
                    footer {{
                        margin-top: 40px;
                        text-align: center;
                        color: #6b7280;
                        font-size: 14px;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <header>
                        <h1>NXT Humans AI CX Workbench</h1>
                        <p class="subtitle">Simple Launcher</p>
                    </header>
                    
                    <div class="note">
                        <strong>Note:</strong> This is a simplified launcher running directly on your machine without Docker.
                        Only the links for services you have running will work.
                    </div>
                    
                    <div class="services">
                        <div class="service">
                            <h3>Launchpad</h3>
                            <p>Central hub for accessing all workbench tools.</p>
                            <a href="http://localhost:{DEFAULT_PORTS['launchpad']}" class="btn" target="_blank">Open Launchpad</a>
                            <span class="status available">Port {DEFAULT_PORTS['launchpad']}</span>
                        </div>
                        
                        <div class="service">
                            <h3>Journey Mapper</h3>
                            <p>Generate interactive customer journey maps from data.</p>
                            <a href="http://localhost:{DEFAULT_PORTS['journey_mapper']}" class="btn" target="_blank">Open Journey Mapper</a>
                            <span class="status unavailable">Port {DEFAULT_PORTS['journey_mapper']}</span>
                        </div>
                        
                        <div class="service">
                            <h3>Reddit Ripper</h3>
                            <p>Collect Reddit data for analysis.</p>
                            <a href="http://localhost:{DEFAULT_PORTS['reddit_ripper']}" class="btn" target="_blank">Open Reddit Ripper</a>
                            <span class="status unavailable">Port {DEFAULT_PORTS['reddit_ripper']}</span>
                        </div>
                        
                        <div class="service">
                            <h3>Social Research Tool</h3>
                            <p>Analyze social media data for insights.</p>
                            <a href="http://localhost:{DEFAULT_PORTS['social_research']}" class="btn" target="_blank">Open Social Research</a>
                            <span class="status unavailable">Port {DEFAULT_PORTS['social_research']}</span>
                        </div>
                    </div>
                    
                    <div class="note">
                        <strong>How to Start Other Services:</strong>
                        <ul>
                            <li>Journey Mapper: Open terminal, go to internal-solutions-journey-mapper and run <code>python run.py</code></li>
                            <li>Reddit Ripper: Open terminal, go to internal-solutions-reddit-ripper and run <code>python app.py</code></li>
                            <li>Social Research: Open terminal, go to internal-solutions-socialresearch/frontend and run <code>npm run dev</code></li>
                        </ul>
                    </div>
                    
                    <footer>
                        &copy; 2025 NXT Humans. All rights reserved.
                    </footer>
                </div>
            </body>
            </html>
            """
            
            self.wfile.write(html.encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'Not found')

def run_server(server_port):
    """Run the simple HTTP server."""
    server_address = ('', server_port)
    httpd = HTTPServer(server_address, SimpleHandler)
    print(f"{Colors.GREEN}Simple launcher is running at: http://localhost:{server_port}{Colors.NC}")
    print(f"{Colors.YELLOW}Visit this URL in your browser to access the workbench{Colors.NC}")
    print(f"{Colors.BLUE}Press Ctrl+C to stop the launcher{Colors.NC}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Shutting down server...{Colors.NC}")
        httpd.server_close()

def open_browser(port):
    """Open a browser to the launcher page."""
    url = f"http://localhost:{port}"
    
    # Wait a moment before opening browser
    time.sleep(1)
    
    try:
        webbrowser.open(url)
    except:
        print(f"{Colors.YELLOW}Could not open browser automatically. Please open {url} manually.{Colors.NC}")

def main():
    """Main function."""
    print_banner()
    
    # Find an available port
    port = find_available_port(DEFAULT_PORTS['launchpad'])
    if not port:
        print(f"{Colors.RED}Could not find an available port!{Colors.NC}")
        sys.exit(1)
    
    # Start browser in a separate thread
    browser_thread = threading.Thread(target=open_browser, args=(port,))
    browser_thread.daemon = True
    browser_thread.start()
    
    # Start the server
    run_server(port)

if __name__ == '__main__':
    main()