#!/usr/bin/env python3
"""
Simple Agent Server - A standalone WebSocket server for NXT HUMANS AI CX WORKBENCH

This script provides a minimal HTTP server that serves a client-side fix for
chatbot issues in the NXT HUMANS AI CX Workbench. It:

1. Starts a simple HTTP server that serves the client fix script
2. Provides a solution that doesn't require any specific Python libraries
3. Works completely in the browser without backend dependencies

Usage:
    python simple-agent-server.py [--port PORT]
"""

import os
import sys
import json
import time
import logging
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('simple-agent.log')
    ]
)
logger = logging.getLogger("simple-agent-server")

# Parse command line arguments
parser = argparse.ArgumentParser(description="Simple Agent Server for NXT HUMANS AI CX WORKBENCH")
parser.add_argument("--port", type=int, default=8500, help="Port to run the HTTP server on")
args = parser.parse_args()

# Client-side fix script
CLIENT_FIX_SCRIPT = """
// NXT HUMANS AI CX WORKBENCH - Direct Agent Client Fix
console.log("🛠️ Loading Direct Agent Client Fix...");

// Track if we've fixed the chatbot yet
window.directAgentFixed = false;

// Store original WebSocket for later
window.OriginalWebSocket = window.WebSocket;

// Create a mock WebSocket implementation
class MockWebSocket {
    constructor(url, protocols) {
        console.log(`📡 Creating mock WebSocket for ${url}`);
        this.url = url;
        this.protocols = protocols;
        this.readyState = WebSocket.CONNECTING;
        
        // Standard WebSocket properties
        this.protocol = "";
        this.extensions = "";
        this.bufferedAmount = 0;
        this.binaryType = "blob";
        
        // Event handlers
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        
        // Extract conversation ID if this is a proxy connection
        if (url.includes('/ws-proxy/')) {
            this.conversationId = url.split('/ws-proxy/')[1];
            console.log(`🔗 Got conversation ID: ${this.conversationId}`);
            
            // Simulate connection open after a delay
            setTimeout(() => {
                this.readyState = WebSocket.OPEN;
                if (this.onopen) {
                    console.log(`✅ Simulating open event for ${this.url}`);
                    this.onopen({});
                }
                
                // Send initial greeting
                if (this.onmessage) {
                    const greeting = {
                        type: "message",
                        content: "Hello! I'm your AI assistant for the NXT HUMANS CX Workbench. How can I help you today?"
                    };
                    console.log(`📩 Sending greeting: ${JSON.stringify(greeting)}`);
                    this.onmessage({
                        data: JSON.stringify(greeting),
                        origin: window.location.origin,
                        lastEventId: '',
                        source: window,
                        ports: []
                    });
                }
            }, 500);
        } else {
            // For non-agent WebSockets, pass through to original
            return new window.OriginalWebSocket(url, protocols);
        }
    }
    
    // Mock send method
    send(data) {
        console.log(`📤 Mock socket sending: ${data}`);
        
        // Parse the message
        try {
            const message = JSON.parse(data);
            
            // If this is a user message, respond
            if (message.type === "message") {
                const userContent = message.content;
                console.log(`📝 User message: ${userContent}`);
                
                // Delay to simulate typing
                setTimeout(() => {
                    if (this.onmessage) {
                        // Send typing indicator
                        const typingIndicator = {
                            type: "status",
                            content: "typing"
                        };
                        this.onmessage({
                            data: JSON.stringify(typingIndicator),
                            origin: window.location.origin,
                            lastEventId: '',
                            source: window,
                            ports: []
                        });
                        
                        // Generate response after a delay
                        setTimeout(() => {
                            // Prepare response based on user message
                            let response;
                            
                            if (userContent.toLowerCase().includes("hello") || 
                                userContent.toLowerCase().includes("hi") ||
                                userContent.toLowerCase().includes("hey")) {
                                response = "Hello! How can I assist you with the NXT HUMANS CX Workbench today?";
                            } else if (userContent.toLowerCase().includes("help")) {
                                response = "I can help you with using the various tools in the workbench: Reddit Data Collector, Social Research Analysis Tool, and AI Journey Mapper. What would you like to know about?";
                            } else if (userContent.toLowerCase().includes("reddit") || 
                                      userContent.toLowerCase().includes("collect")) {
                                response = "The Reddit Data Collector allows you to gather data from subreddits. You can specify time periods, post types, and generate PDF reports of the collected data.";
                            } else if (userContent.toLowerCase().includes("social") || 
                                      userContent.toLowerCase().includes("research")) {
                                response = "The Social Research Analysis Tool provides advanced analytics for social media data, including topic modeling, sentiment analysis, and interactive visualizations.";
                            } else if (userContent.toLowerCase().includes("journey") || 
                                      userContent.toLowerCase().includes("map")) {
                                response = "The AI Journey Mapper helps you create customer journey maps using Claude 3.7 Sonnet. It can process multiple data formats and generate interactive visualizations.";
                            } else if (userContent.toLowerCase().includes("docker") || 
                                      userContent.toLowerCase().includes("container")) {
                                response = "The workbench uses Docker to containerize the various applications. You can manage containers using docker-compose commands, and check status with 'docker compose -f dynamic-compose.yml ps'.";
                            } else if (userContent.toLowerCase().includes("api") || 
                                      userContent.toLowerCase().includes("key")) {
                                response = "You can update your Anthropic API key using the ./update_anthropic_key.sh script. This is required for the Journey Mapper and Social Research Tool to work properly.";
                            } else {
                                response = "I'm currently running in standalone mode to demonstrate the chatbot functionality. In normal operation, I would connect to Claude 3.7 Sonnet to provide comprehensive assistance with the NXT HUMANS CX Workbench.";
                            }
                            
                            // Send the response
                            const responseMessage = {
                                type: "message",
                                content: response
                            };
                            
                            this.onmessage({
                                data: JSON.stringify(responseMessage),
                                origin: window.location.origin,
                                lastEventId: '',
                                source: window,
                                ports: []
                            });
                        }, 1500);
                    }
                }, 500);
            } else if (message.type === "ping") {
                // Respond to ping messages
                if (this.onmessage) {
                    const pong = {
                        type: "pong"
                    };
                    this.onmessage({
                        data: JSON.stringify(pong),
                        origin: window.location.origin,
                        lastEventId: '',
                        source: window,
                        ports: []
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Error processing message: ${error}`);
        }
    }
    
    // Mock close method
    close(code, reason) {
        console.log(`🔄 Mock socket closing: code=${code}, reason=${reason}`);
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) {
            this.onclose({
                code: code || 1000,
                reason: reason || "Closed by client",
                wasClean: true
            });
        }
    }
}

// Function to fix the chatbot
function fixChatbot() {
    // Don't fix if already fixed
    if (window.directAgentFixed) {
        console.log("🔄 Chatbot already fixed");
        return;
    }
    
    console.log("🔧 Fixing chatbot WebSocket connections...");
    
    // Override WebSocket constructor globally
    window.WebSocket = function(url, protocols) {
        console.log(`🔍 WebSocket request intercepted: ${url}`);
        
        // Check if this is a proxy connection to the agent
        if (url.includes('/ws-proxy/')) {
            console.log(`✅ Redirecting ${url} to mock WebSocket`);
            return new MockWebSocket(url, protocols);
        }
        
        // Use original implementation for other connections
        return new window.OriginalWebSocket(url, protocols);
    };
    
    // Copy WebSocket prototype and constants
    window.WebSocket.prototype = window.OriginalWebSocket.prototype;
    window.WebSocket.CONNECTING = window.OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = window.OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = window.OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = window.OriginalWebSocket.CLOSED;
    
    // Mark as fixed
    window.directAgentFixed = true;
    
    console.log("✅ Chatbot WebSocket fixed successfully");
    
    // Add status display
    addStatusDisplay();
    
    return "✅ Chatbot fixed successfully! Try sending a message.";
}

// Add status display
function addStatusDisplay() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'direct-agent-status';
    statusDiv.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        z-index: 10000;
        max-width: 300px;
        transition: all 0.3s ease;
    `;
    
    statusDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <div><b>Direct Agent Status</b></div>
            <div>
                <button id="direct-agent-hide" style="background: #444; border: none; color: white; padding: 2px 5px; border-radius: 3px;">Hide</button>
            </div>
        </div>
        <div>
            <div>Mode: <span style="color: #00ff00;">Standalone</span></div>
            <div>Status: <span style="color: #00ff00;">✅ Active</span></div>
        </div>
        <div style="margin-top: 5px; font-size: 10px;">
            Simple agent is running in standalone mode.<br>
            All responses are simulated.
        </div>
    `;
    
    document.body.appendChild(statusDiv);
    
    // Add event listeners
    document.getElementById('direct-agent-hide').addEventListener('click', function() {
        statusDiv.style.display = 'none';
    });
}

// Apply fix when loaded
document.addEventListener('DOMContentLoaded', fixChatbot);

// Also fix when body is available
if (document.body) {
    fixChatbot();
} else {
    // Wait for body to be available
    const bodyCheckInterval = setInterval(() => {
        if (document.body) {
            fixChatbot();
            clearInterval(bodyCheckInterval);
        }
    }, 100);
}

// Expose commands
window.directAgentCommands = {
    fix: fixChatbot,
    status: function() {
        return {
            fixed: window.directAgentFixed,
            mode: "standalone"
        };
    }
};

console.log("✅ Direct Agent Client Fix loaded successfully");
"""

# HTTP request handler for serving the client fix script
class ClientFixHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/fix.js':
            self.send_response(200)
            self.send_header('Content-type', 'application/javascript')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(CLIENT_FIX_SCRIPT.encode('utf-8'))
            return
        elif self.path == '/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            status = {
                'status': 'ok',
                'mode': 'standalone',
                'timestamp': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(status).encode('utf-8'))
            return
        else:
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Simple Agent Server</title>
                <style>
                    body {{ font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
                    h1, h2 {{ color: #01C4C8; }}
                    pre {{ background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }}
                    .card {{ background: #fff; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 20px; }}
                </style>
            </head>
            <body>
                <h1>Simple Agent Server</h1>
                <div class="card">
                    <p>The Simple Agent Server is running. This is a standalone HTTP server that provides a client-side fix for the NXT HUMANS AI CX Workbench chatbot.</p>
                    <p>To use this fix, open your browser console on the workbench page and enter:</p>
                    <pre>const script = document.createElement('script'); script.src = 'http://localhost:{args.port}/fix.js'; document.head.appendChild(script);</pre>
                </div>
                <div class="card">
                    <h2>Server Details</h2>
                    <ul>
                        <li><strong>HTTP Server:</strong> http://localhost:{args.port}</li>
                        <li><strong>Client Fix Script:</strong> http://localhost:{args.port}/fix.js</li>
                        <li><strong>Status Endpoint:</strong> http://localhost:{args.port}/status</li>
                    </ul>
                </div>
                <div class="card">
                    <h2>What This Does</h2>
                    <p>This server provides a client-side fix that:</p>
                    <ol>
                        <li>Intercepts WebSocket connections to the agent</li>
                        <li>Replaces them with a mock implementation</li>
                        <li>Simulates responses to messages</li>
                    </ol>
                    <p>This allows the chatbot to function without requiring the Docker containers to work correctly.</p>
                </div>
            </body>
            </html>
            """
            self.wfile.write(html.encode('utf-8'))

def run_http_server(port):
    """Run the HTTP server in a separate thread"""
    server = HTTPServer(('0.0.0.0', port), ClientFixHandler)
    logger.info(f"Starting HTTP server on port {port}")
    server.serve_forever()

def main():
    """Main function"""
    print("="*80)
    print(" NXT HUMANS AI CX WORKBENCH - SIMPLE AGENT SERVER ")
    print("="*80)
    print(f"Starting server on port {args.port}...")
    
    # Start HTTP server in a separate thread
    http_thread = threading.Thread(target=run_http_server, args=(args.port,))
    http_thread.daemon = True
    http_thread.start()
    
    print("\n✨ Simple Agent Server is running!")
    print(f"📋 Server URL: http://localhost:{args.port}")
    print(f"📋 Client Fix URL: http://localhost:{args.port}/fix.js")
    print("\nTo use the fix, open your browser console on the workbench page and run:")
    print("   const script = document.createElement('script'); script.src = 'http://localhost:8500/fix.js'; document.head.appendChild(script);")
    print("\nPress Ctrl+C to stop the server.")
    print("="*80)
    
    # Keep the main thread running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down server...")
        sys.exit(0)

if __name__ == "__main__":
    main()