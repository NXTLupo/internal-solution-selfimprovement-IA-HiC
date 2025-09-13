#!/usr/bin/env python3
"""
Direct Agent Server for NXT HUMANS AI CX WORKBENCH

This is a standalone WebSocket server that bypasses Docker networking issues
by running directly on the host machine. It also serves a client JavaScript
file that helps the browser connect directly to this server.
"""

import os
import sys
import json
import time
import asyncio
import logging
import argparse
from datetime import datetime
import anthropic
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('agent-server.log')
    ]
)
logger = logging.getLogger("direct-agent-server")

# Parse command line arguments
parser = argparse.ArgumentParser(description="Direct Agent Server for NXT HUMANS AI CX WORKBENCH")
parser.add_argument("--port", type=int, default=8500, help="Port to run the WebSocket server on")
parser.add_argument("--api-key", type=str, default="", help="Anthropic API key")
args = parser.parse_args()

# Set up the API key
ANTHROPIC_API_KEY = args.api_key or os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    logger.error("No Anthropic API key provided. Please provide via --api-key or ANTHROPIC_API_KEY environment variable.")
    sys.exit(1)

# Initialize FastAPI
app = FastAPI()

# Add CORS middleware to allow connections from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Claude client
try:
    claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    logger.info("Successfully initialized Claude client")
except Exception as e:
    logger.error(f"Failed to initialize Claude client: {e}")
    sys.exit(1)

# In-memory storage for conversations
conversations = {}

# Define the client JavaScript for browser-side communication
CLIENT_JS = """
// Direct Agent Client for NXT HUMANS AI CX WORKBENCH
console.log("🚀 Direct Agent Client loaded successfully!");

// Store the connection status
window.DirectAgentStatus = {
    isConnected: false,
    lastMessage: null,
    reconnectAttempts: 0,
};

// Create a WebSocket connection to the direct agent server
class DirectAgentSocket {
    constructor(conversationId) {
        this.conversationId = conversationId;
        this.socket = null;
        this.isConnected = false;
        this.messageQueue = [];
        this.onMessageCallbacks = [];
        this.connect();
    }
    
    connect() {
        const url = `ws://localhost:8500/ws/${this.conversationId}`;
        console.log(`🔄 Connecting to direct agent server: ${url}`);
        
        this.socket = new WebSocket(url);
        
        this.socket.onopen = () => {
            console.log(`✅ Direct agent connection established for ${this.conversationId}`);
            this.isConnected = true;
            window.DirectAgentStatus.isConnected = true;
            window.DirectAgentStatus.reconnectAttempts = 0;
            
            // Send any queued messages
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                this.socket.send(message);
            }
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log(`📥 Received from direct agent:`, data);
                window.DirectAgentStatus.lastMessage = data;
                
                // Notify all callbacks
                this.onMessageCallbacks.forEach(callback => callback(data));
            } catch (error) {
                console.error(`❌ Error parsing message from direct agent:`, error);
            }
        };
        
        this.socket.onclose = (event) => {
            console.log(`🔄 Direct agent connection closed: code=${event.code}, reason=${event.reason}`);
            this.isConnected = false;
            window.DirectAgentStatus.isConnected = false;
            
            // Attempt to reconnect if this wasn't a normal closure
            if (event.code !== 1000 && event.code !== 1001) {
                window.DirectAgentStatus.reconnectAttempts++;
                
                // Exponential backoff for reconnection attempts
                const delay = Math.min(1000 * Math.pow(1.5, window.DirectAgentStatus.reconnectAttempts), 30000);
                console.log(`⏳ Reconnecting in ${delay/1000}s... (attempt ${window.DirectAgentStatus.reconnectAttempts})`);
                
                setTimeout(() => this.connect(), delay);
            }
        };
        
        this.socket.onerror = (error) => {
            console.error(`❌ Direct agent socket error:`, error);
        };
    }
    
    send(message) {
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            console.log(`📤 Sending to direct agent:`, message);
            this.socket.send(typeof message === 'string' ? message : JSON.stringify(message));
        } else {
            console.log(`⏳ Connection not ready, queueing message`);
            this.messageQueue.push(typeof message === 'string' ? message : JSON.stringify(message));
        }
    }
    
    onMessage(callback) {
        this.onMessageCallbacks.push(callback);
    }
    
    close() {
        if (this.socket) {
            this.socket.close(1000, "Closed by client");
        }
    }
}

// Function to hook into the chatbot's WebSocket
window.hookChatbotWebSocket = function() {
    try {
        console.log("🔍 Looking for chatbot iframe...");
        const chatbotFrame = document.querySelector('.chatbot-frame');
        
        if (!chatbotFrame || !chatbotFrame.contentWindow) {
            console.log("❌ Chatbot iframe not found or not accessible");
            return false;
        }
        
        const iframeWindow = chatbotFrame.contentWindow;
        console.log("✅ Found chatbot iframe");
        
        // Store the original WebSocket constructor
        const OriginalWebSocket = iframeWindow.WebSocket;
        
        // Keep track of direct agent connections
        const directConnections = {};
        
        // Override the WebSocket constructor
        iframeWindow.WebSocket = function(url, protocols) {
            console.log(`🔍 WebSocket intercepted: ${url}`);
            
            // Check if this is a proxy connection to the agent
            if (url.includes('/ws-proxy/')) {
                try {
                    // Extract the conversation ID
                    const conversationId = url.split('/ws-proxy/')[1];
                    console.log(`🔄 Creating direct connection for ${conversationId}`);
                    
                    // Create a direct connection if one doesn't exist
                    if (!directConnections[conversationId]) {
                        directConnections[conversationId] = new DirectAgentSocket(conversationId);
                    }
                    
                    // Create a mock WebSocket that redirects to our direct connection
                    const mockSocket = {
                        // Standard WebSocket properties
                        readyState: WebSocket.CONNECTING,
                        protocol: "",
                        extensions: "",
                        bufferedAmount: 0,
                        binaryType: "blob",
                        
                        // Event handlers
                        onopen: null,
                        onmessage: null,
                        onclose: null,
                        onerror: null,
                        
                        // Methods
                        send: function(data) {
                            console.log(`📤 Mock socket sending:`, data);
                            directConnections[conversationId].send(data);
                        },
                        
                        close: function(code, reason) {
                            console.log(`🔄 Mock socket closing: code=${code}, reason=${reason}`);
                            directConnections[conversationId].close();
                            this.readyState = WebSocket.CLOSED;
                            if (this.onclose) {
                                this.onclose({
                                    code: code || 1000,
                                    reason: reason || "Closed by client",
                                    wasClean: true
                                });
                            }
                        }
                    };
                    
                    // Set up event forwarding
                    directConnections[conversationId].onMessage(function(data) {
                        if (mockSocket.onmessage) {
                            mockSocket.onmessage({
                                data: typeof data === 'string' ? data : JSON.stringify(data),
                                origin: window.location.origin,
                                lastEventId: '',
                                source: window,
                                ports: []
                            });
                        }
                    });
                    
                    // Simulate connection opening after a short delay
                    setTimeout(function() {
                        mockSocket.readyState = WebSocket.OPEN;
                        if (mockSocket.onopen) {
                            mockSocket.onopen({});
                        }
                    }, 50);
                    
                    console.log(`✅ Created mock WebSocket for ${conversationId}`);
                    return mockSocket;
                } catch (error) {
                    console.error(`❌ Error creating direct connection:`, error);
                    // Fall back to original WebSocket
                    return new OriginalWebSocket(url, protocols);
                }
            } else {
                // Use original implementation for other connections
                return new OriginalWebSocket(url, protocols);
            }
        };
        
        // Copy static properties
        iframeWindow.WebSocket.prototype = OriginalWebSocket.prototype;
        iframeWindow.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
        iframeWindow.WebSocket.OPEN = OriginalWebSocket.OPEN;
        iframeWindow.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
        iframeWindow.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
        
        console.log("✅ Successfully hooked chatbot WebSocket");
        return true;
    } catch (error) {
        console.error(`❌ Error hooking chatbot WebSocket:`, error);
        return false;
    }
};

// Create a server status pane
window.createStatusPane = function() {
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
        <div id="direct-agent-connection-status">
            <div>Connection: <span id="connection-status">Initializing...</span></div>
            <div>Last Updated: <span id="last-updated">Never</span></div>
        </div>
        <div style="margin-top: 5px;">
            <button id="direct-agent-reload" style="background: #01C4C8; border: none; color: black; padding: 5px; border-radius: 3px; width: 100%;">Reload Connection</button>
        </div>
    `;
    
    document.body.appendChild(statusDiv);
    
    // Add event listeners
    document.getElementById('direct-agent-hide').addEventListener('click', function() {
        statusDiv.style.transform = 'translateX(calc(100% - 30px))';
        statusDiv.innerHTML = `
            <button id="direct-agent-show" style="position: absolute; left: 0; top: 0; height: 100%; width: 30px; background: rgba(0, 0, 0, 0.8); border: none; color: white; border-radius: 5px 0 0 5px;">◀</button>
        `;
        document.getElementById('direct-agent-show').addEventListener('click', function() {
            window.createStatusPane();
        });
    });
    
    document.getElementById('direct-agent-reload').addEventListener('click', function() {
        window.hookChatbotWebSocket();
        updateStatus();
        const btn = document.getElementById('direct-agent-reload');
        btn.textContent = 'Reloading...';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = 'Reload Connection';
            btn.disabled = false;
        }, 2000);
    });
    
    // Update status periodically
    function updateStatus() {
        const connectionStatus = document.getElementById('connection-status');
        const lastUpdated = document.getElementById('last-updated');
        
        if (window.DirectAgentStatus.isConnected) {
            connectionStatus.textContent = '✅ Connected';
            connectionStatus.style.color = '#00ff00';
        } else {
            connectionStatus.textContent = '❌ Disconnected';
            connectionStatus.style.color = '#ff0000';
        }
        
        lastUpdated.textContent = new Date().toLocaleTimeString();
    }
    
    // Update now and every 2 seconds
    updateStatus();
    setInterval(updateStatus, 2000);
};

// Initialize when the page loads
window.addEventListener('load', function() {
    console.log("🔄 Page loaded, initializing direct agent client...");
    
    // Look for the chatbot every second until found
    const checkInterval = setInterval(function() {
        const chatbotFrame = document.querySelector('.chatbot-frame');
        if (chatbotFrame && chatbotFrame.contentWindow) {
            console.log("✅ Chatbot iframe found, hooking WebSocket...");
            window.hookChatbotWebSocket();
            window.createStatusPane();
            clearInterval(checkInterval);
        }
    }, 1000);
    
    // Also check when iframe loads
    document.addEventListener('load', function(event) {
        if (event.target.tagName === 'IFRAME' && event.target.classList.contains('chatbot-frame')) {
            console.log("✅ Chatbot iframe loaded, hooking WebSocket...");
            window.hookChatbotWebSocket();
            window.createStatusPane();
        }
    }, true);
});

// Expose global commands
window.directAgentCommands = {
    status: function() {
        return window.DirectAgentStatus;
    },
    reconnect: function() {
        return window.hookChatbotWebSocket();
    },
    showStatus: function() {
        window.createStatusPane();
        return "Status pane shown";
    }
};

console.log("✅ Direct Agent Client initialization complete");
"""

# Define the Claude system prompt
SYSTEM_PROMPT = """
You are an NXT HUMANS CX Workbench agent, a helpful AI assistant that provides information about the various tools and services available in the workbench. You can help users understand how to use the platform's features, troubleshoot issues, and provide guidance on using the different applications.

The NXT HUMANS AI CX Workbench includes:
1. Reddit Data Collector - for gathering data from Reddit
2. Social Research Analysis Tool - for analyzing social media data
3. AI Journey Mapper - for creating customer journey maps
4. AI Agent Assistant - that's you!

Try to be helpful, concise, and friendly in your responses.
"""

async def get_claude_response(user_message, conversation_history=None):
    """Get response from Claude API"""
    if conversation_history is None:
        conversation_history = []
    
    try:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]
        
        # Add conversation history
        for msg in conversation_history:
            messages.append(msg)
            
        # Add the current user message
        messages.append({"role": "user", "content": user_message})
        
        # Get response from Claude
        response = claude_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=2000,
            messages=messages
        )
        
        return response.content[0].text
    except Exception as e:
        logger.error(f"Error getting Claude response: {e}")
        return f"I'm sorry, I encountered an error while processing your request. Error details: {str(e)}"

@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {"status": "ok", "message": "Direct Agent Server is running"}

@app.get("/client.js")
async def client_js():
    """Serve the client JavaScript file"""
    return PlainTextResponse(content=CLIENT_JS, media_type="application/javascript")

@app.get("/status")
async def status():
    """Status endpoint"""
    return JSONResponse({
        "status": "ok",
        "uptime": time.time() - start_time,
        "active_connections": len(conversations),
        "timestamp": datetime.now().isoformat()
    })

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time chat"""
    logger.info(f"WebSocket connection attempt for {conversation_id}")
    
    # Initialize conversation if needed
    if conversation_id not in conversations:
        conversations[conversation_id] = []
    
    # Accept the connection
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for {conversation_id}")
    
    # Send initial greeting
    greeting = {
        "type": "message",
        "content": "Hello! I'm your AI assistant for the NXT HUMANS CX Workbench. How can I help you today?"
    }
    await websocket.send_json(greeting)
    
    try:
        while True:
            # Wait for messages from the client
            message = await websocket.receive_text()
            logger.info(f"Received message from {conversation_id}: {message[:100]}...")
            
            try:
                # Parse the message
                data = json.loads(message)
                
                # Check if this is a proper message or a system message
                if data.get("type") == "message":
                    user_message = data.get("content", "")
                    
                    # Send typing indicator
                    await websocket.send_json({"type": "status", "content": "typing"})
                    
                    # Get response from Claude
                    claude_response = await get_claude_response(
                        user_message, 
                        conversations[conversation_id]
                    )
                    
                    # Add messages to conversation history
                    conversations[conversation_id].append({"role": "user", "content": user_message})
                    conversations[conversation_id].append({"role": "assistant", "content": claude_response})
                    
                    # Cap conversation history at 10 messages (5 exchanges)
                    if len(conversations[conversation_id]) > 10:
                        conversations[conversation_id] = conversations[conversation_id][-10:]
                    
                    # Send response back to client
                    response = {
                        "type": "message",
                        "content": claude_response
                    }
                    await websocket.send_json(response)
                    logger.info(f"Sent response to {conversation_id}: {claude_response[:100]}...")
                
                # Handle other message types
                elif data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif data.get("type") == "echo":
                    # Echo back the content
                    await websocket.send_json({
                        "type": "echo",
                        "content": data.get("content", ""),
                        "timestamp": datetime.now().isoformat()
                    })
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from {conversation_id}")
                await websocket.send_json({
                    "type": "error",
                    "content": "Invalid message format. Expected JSON."
                })
            except Exception as e:
                logger.error(f"Error processing message from {conversation_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "content": f"Error processing your message: {str(e)}"
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {conversation_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {conversation_id}: {e}")

if __name__ == "__main__":
    print("="*80)
    print(" NXT HUMANS AI CX WORKBENCH - DIRECT AGENT SERVER ")
    print("="*80)
    print(f"Starting WebSocket server on port {args.port}...")
    
    # Record the start time
    start_time = time.time()
    
    # Check if API key is valid
    try:
        response = claude_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=10,
            messages=[
                {"role": "user", "content": "Reply with 'OK' only"}
            ]
        )
        if "OK" in response.content[0].text:
            print("✅ Anthropic API key is valid")
        else:
            print("⚠️ Anthropic API key may not be working correctly")
    except Exception as e:
        print(f"❌ Anthropic API key validation failed: {e}")
        sys.exit(1)
        
    print("\n✨ Direct Agent Server is starting...")
    print(f"📋 Server URL: http://localhost:{args.port}")
    print(f"📋 WebSocket URL: ws://localhost:{args.port}/ws/YOUR_CONVERSATION_ID")
    print(f"📋 Client JS URL: http://localhost:{args.port}/client.js")
    print("\nTo test in browser console, run:")
    print("   const script = document.createElement('script'); script.src = 'http://localhost:8500/client.js'; document.head.appendChild(script);")
    print("="*80)
    
    # Start the FastAPI server with uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port)