// Add this to the page to add more debugging and tracking for WebSocket communication
document.addEventListener('DOMContentLoaded', function() {
    // Create a debug logger element
    const debugLogger = document.createElement('div');
    debugLogger.id = 'websocket-debug-logger';
    debugLogger.style.position = 'fixed';
    debugLogger.style.bottom = '10px';
    debugLogger.style.right = '10px';
    debugLogger.style.width = '350px';
    debugLogger.style.maxHeight = '250px';
    debugLogger.style.overflowY = 'auto';
    debugLogger.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugLogger.style.color = '#00ff00';
    debugLogger.style.padding = '10px';
    debugLogger.style.fontFamily = 'monospace';
    debugLogger.style.fontSize = '12px';
    debugLogger.style.zIndex = '10000';
    debugLogger.style.display = 'none'; // Hidden by default
    debugLogger.style.borderRadius = '5px';
    
    const loggerToggle = document.createElement('button');
    loggerToggle.textContent = '🐞 Debug';
    loggerToggle.style.position = 'fixed';
    loggerToggle.style.bottom = '10px';
    loggerToggle.style.right = '10px';
    loggerToggle.style.backgroundColor = '#333';
    loggerToggle.style.color = 'white';
    loggerToggle.style.border = 'none';
    loggerToggle.style.padding = '5px 10px';
    loggerToggle.style.borderRadius = '5px';
    loggerToggle.style.zIndex = '10001';
    loggerToggle.style.cursor = 'pointer';
    
    document.body.appendChild(debugLogger);
    document.body.appendChild(loggerToggle);
    
    let isLoggerVisible = false;
    loggerToggle.addEventListener('click', () => {
        isLoggerVisible = !isLoggerVisible;
        debugLogger.style.display = isLoggerVisible ? 'block' : 'none';
    });
    
    // Add log function
    window.wsDebugLog = function(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        
        switch(type) {
            case 'error':
                entry.style.color = '#ff6666';
                break;
            case 'success':
                entry.style.color = '#66ff66';
                break;
            case 'warn':
                entry.style.color = '#ffcc00';
                break;
            default:
                entry.style.color = '#00ffff';
        }
        
        debugLogger.prepend(entry);
        console.log(`[WS DEBUG] ${msg}`);
        
        // Trim logs to prevent too many entries
        while (debugLogger.children.length > 20) {
            debugLogger.removeChild(debugLogger.lastChild);
        }
    };
    
    // Monkey patch WebSocket to add debugging
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        wsDebugLog(`Creating WebSocket to ${url}`, 'info');
        
        const socket = new originalWebSocket(url, protocols);
        
        // Add event listeners to track WebSocket state
        socket.addEventListener('open', function() {
            wsDebugLog(`WebSocket CONNECTED`, 'success');
        });
        
        socket.addEventListener('close', function(event) {
            wsDebugLog(`WebSocket CLOSED (code: ${event.code}, reason: ${event.reason})`, 'warn');
        });
        
        socket.addEventListener('error', function() {
            wsDebugLog(`WebSocket ERROR`, 'error');
        });
        
        // Intercept message sending
        const originalSend = socket.send;
        socket.send = function(data) {
            try {
                const parsedData = JSON.parse(data);
                wsDebugLog(`SENDING: ${JSON.stringify(parsedData).substring(0, 100)}...`, 'info');
            } catch(e) {
                wsDebugLog(`SENDING: (unparseable data)`, 'info');
            }
            return originalSend.call(this, data);
        };
        
        // Intercept message receiving
        socket.addEventListener('message', function(event) {
            try {
                const parsedData = JSON.parse(event.data);
                wsDebugLog(`RECEIVED: ${JSON.stringify(parsedData).substring(0, 100)}...`, 'info');
            } catch(e) {
                wsDebugLog(`RECEIVED: (unparseable data)`, 'info');
            }
        });
        
        return socket;
    };
    
    // Add properties from the original WebSocket
    window.WebSocket.prototype = originalWebSocket.prototype;
    window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
    window.WebSocket.OPEN = originalWebSocket.OPEN;
    window.WebSocket.CLOSING = originalWebSocket.CLOSING;
    window.WebSocket.CLOSED = originalWebSocket.CLOSED;
    
    wsDebugLog('WebSocket debugging initialized', 'success');
    
    // Check if chatbot exists and add debug info
    setTimeout(() => {
        if (window.chatbot) {
            wsDebugLog(`Chatbot found: conversationId=${window.chatbot.conversationId}`, 'success');
            
            // Add special debug button to force reconnection
            const forceReconnectBtn = document.createElement('button');
            forceReconnectBtn.textContent = '🔄 Reconnect';
            forceReconnectBtn.style.position = 'fixed';
            forceReconnectBtn.style.bottom = '10px';
            forceReconnectBtn.style.right = '85px';
            forceReconnectBtn.style.backgroundColor = '#007bff';
            forceReconnectBtn.style.color = 'white';
            forceReconnectBtn.style.border = 'none';
            forceReconnectBtn.style.padding = '5px 10px';
            forceReconnectBtn.style.borderRadius = '5px';
            forceReconnectBtn.style.zIndex = '10001';
            forceReconnectBtn.style.cursor = 'pointer';
            
            forceReconnectBtn.addEventListener('click', () => {
                wsDebugLog('Force reconnecting WebSocket...', 'warn');
                if (window.chatbot.socket) {
                    window.chatbot.socket.close();
                }
                window.chatbot.initWebSocket();
            });
            
            document.body.appendChild(forceReconnectBtn);
        } else {
            wsDebugLog(`Chatbot not found!`, 'error');
        }
    }, 2000);
});