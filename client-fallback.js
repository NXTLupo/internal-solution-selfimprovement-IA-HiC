// NXT HUMANS AI CX WORKBENCH - WebSocket Fallback Solution
console.log("🔧 Loading WebSocket Fallback Solution...");

// Store original WebSocket for later
const OriginalWebSocket = window.WebSocket;

// Track connection attempts
let connectionAttempts = {};
let useDirectConnection = false;

// Override the WebSocket constructor
window.WebSocket = function(url, protocols) {
    console.log(`🔍 WebSocket request intercepted: ${url}`);
    
    // Check if this is a proxy connection to the agent
    if (url.includes('/ws-proxy/')) {
        // Extract the conversation ID
        const conversationId = url.split('/ws-proxy/')[1];
        console.log(`🔗 Conversation ID: ${conversationId}`);
        
        // Track connection attempts for this conversation
        if (!connectionAttempts[conversationId]) {
            connectionAttempts[conversationId] = 0;
        }
        
        // Determine which URL to use
        let actualUrl = url;
        if (useDirectConnection) {
            // Use direct connection to agent
            actualUrl = `ws://localhost:8500/ws/${conversationId}`;
            console.log(`🔄 Using direct connection: ${actualUrl}`);
        } else {
            console.log(`🔄 Using proxy connection: ${actualUrl}`);
        }
        
        // Create the WebSocket with the selected URL
        const socket = new OriginalWebSocket(actualUrl, protocols);
        
        // Add extra error handling
        const originalOnError = socket.onerror;
        socket.onerror = function(event) {
            console.error(`❌ WebSocket error on ${actualUrl}`, event);
            connectionAttempts[conversationId]++;
            
            // If we've had multiple errors with the current approach, try the other approach
            if (connectionAttempts[conversationId] >= 2 && !useDirectConnection) {
                console.log(`⚠️ Multiple failures with proxy connection. Switching to direct connection.`);
                useDirectConnection = true;
                
                // Add status message to page
                displayStatusMessage(`Switching to direct connection after proxy failures...`);
            }
            
            // Call original handler if it exists
            if (originalOnError) originalOnError.call(socket, event);
        };
        
        // Add extra close handling
        const originalOnClose = socket.onclose;
        socket.onclose = function(event) {
            console.log(`🔄 WebSocket closed: code=${event.code}, reason=${event.reason}, url=${actualUrl}`);
            
            // If connection was never established (code 1006) and we're not using direct connection
            if (event.code === 1006 && !useDirectConnection) {
                console.log(`⚠️ Abnormal closure (1006). Switching to direct connection.`);
                useDirectConnection = true;
                
                // Add status message to page
                displayStatusMessage(`WebSocket connection failed. Trying direct connection...`);
            }
            
            // Call original handler if it exists
            if (originalOnClose) originalOnClose.call(socket, event);
        };
        
        return socket;
    }
    
    // Use original implementation for other connections
    return new OriginalWebSocket(url, protocols);
};

// Copy WebSocket prototype and constants
window.WebSocket.prototype = OriginalWebSocket.prototype;
window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
window.WebSocket.OPEN = OriginalWebSocket.OPEN;
window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

// Display status message
function displayStatusMessage(message) {
    // Check if we already have a status div
    let statusDiv = document.getElementById('websocket-fallback-status');
    
    if (!statusDiv) {
        // Create status div if it doesn't exist
        statusDiv = document.createElement('div');
        statusDiv.id = 'websocket-fallback-status';
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
        document.body.appendChild(statusDiv);
    }
    
    // Update the status message
    statusDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div><b>WebSocket Fallback</b></div>
            <div>
                <button id="close-status" style="background: none; border: none; color: white; cursor: pointer;">×</button>
            </div>
        </div>
        <div style="margin-top: 5px; font-size: 12px;">
            ${message}
        </div>
        <div style="margin-top: 5px; font-size: 10px; color: #aaa;">
            Mode: ${useDirectConnection ? 'Direct' : 'Proxy'}
        </div>
    `;
    
    // Add event listener for close button
    document.getElementById('close-status').addEventListener('click', function() {
        statusDiv.style.display = 'none';
    });
}

// Force switching to direct connection
window.useDirectConnection = function() {
    useDirectConnection = true;
    console.log(`🔄 Switched to direct connection mode`);
    displayStatusMessage(`Switched to direct connection mode. Refresh the page or reconnect the chatbot.`);
    return "Direct connection mode enabled. Refresh the page to apply.";
};

// Force switching to proxy connection
window.useProxyConnection = function() {
    useDirectConnection = false;
    console.log(`🔄 Switched to proxy connection mode`);
    displayStatusMessage(`Switched to proxy connection mode. Refresh the page or reconnect the chatbot.`);
    return "Proxy connection mode enabled. Refresh the page to apply.";
};

// Show status
displayStatusMessage("WebSocket Fallback Solution loaded. Will automatically switch to direct connection if proxy fails.");

console.log("✅ WebSocket Fallback Solution loaded successfully");