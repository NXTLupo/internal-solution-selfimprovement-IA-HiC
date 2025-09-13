/**
 * Enhanced WebSocket Client with Robust Fallback
 * This script provides a reliable WebSocket connection to the agent service
 * with automatic fallback to polling if WebSocket fails.
 */

class EnhancedAgentConnection {
    constructor(options = {}) {
        // Configuration
        this.baseUrl = options.baseUrl || window.location.origin;
        this.wsProxyPath = options.wsProxyPath || '/ws-proxy';
        this.apiPath = options.apiPath || '/proxy/agent';
        this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
        this.reconnectDelay = options.reconnectDelay || 1000;
        this.pingInterval = options.pingInterval || 20000;
        this.debug = options.debug || false;
        
        // State
        this.conversationId = null;
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.pingTimer = null;
        this.connected = false;
        this.usePolling = false;
        this.messageQueue = [];
        this.pollInterval = null;
        this.lastPollTime = 0;
        this.currentMessageId = 0;
        this.pendingMessages = {};
        this.callbacks = {
            onMessage: options.onMessage || function() {},
            onStatus: options.onStatus || function() {},
            onError: options.onError || function() {},
            onConnected: options.onConnected || function() {},
            onDisconnected: options.onDisconnected || function() {}
        };
        
        // Logging
        this.log = this.debug ? console.log.bind(console, '[AgentConnection]') : function() {};
    }
    
    /**
     * Initialize the connection and create a conversation
     */
    async initialize() {
        try {
            this.log('Initializing agent connection');
            
            // Create a conversation
            const response = await fetch(`${this.baseUrl}${this.apiPath}/api/chat/conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create conversation: ${response.status}`);
            }
            
            const data = await response.json();
            this.conversationId = data.conversation_id;
            this.log(`Created conversation: ${this.conversationId}`);
            
            // Try WebSocket connection first
            await this.connectWebSocket();
            return true;
        } catch (error) {
            this.log(`Initialization error: ${error.message}`);
            this.callbacks.onError(`Failed to initialize agent connection: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Connect to the WebSocket server
     */
    async connectWebSocket() {
        if (this.websocket) {
            this.closeWebSocket();
        }
        
        try {
            this.log(`Attempting to connect to WebSocket (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            this.callbacks.onStatus({
                status: 'connecting',
                message: `Connecting to agent service (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`
            });
            
            // Get the WebSocket URL for the conversation
            const wsInfo = await this.getWebSocketInfo();
            const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${wsInfo.ws_url}`;
            
            this.log(`Opening WebSocket connection to ${wsUrl}`);
            this.websocket = new WebSocket(wsUrl);
            
            // Set up event handlers
            this.websocket.onopen = this.onWebSocketOpen.bind(this);
            this.websocket.onmessage = this.onWebSocketMessage.bind(this);
            this.websocket.onclose = this.onWebSocketClose.bind(this);
            this.websocket.onerror = this.onWebSocketError.bind(this);
            
            return true;
        } catch (error) {
            this.log(`WebSocket connection error: ${error.message}`);
            this.handleConnectionFailure(error);
            return false;
        }
    }
    
    /**
     * Get WebSocket URL for the conversation
     */
    async getWebSocketInfo() {
        try {
            const response = await fetch(`${this.baseUrl}${this.apiPath}/api/chat/ws/${this.conversationId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to get WebSocket info: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            this.log(`Error getting WebSocket info: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Handle WebSocket open event
     */
    onWebSocketOpen(event) {
        this.log('WebSocket connection opened');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.startPingInterval();
        
        this.callbacks.onConnected({
            connectionType: 'websocket',
            conversationId: this.conversationId
        });
        
        // Process any queued messages
        this.processMessageQueue();
    }
    
    /**
     * Handle WebSocket message event
     */
    onWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.log(`Received WebSocket message:`, data);
            
            if (data.type === 'message') {
                // Regular message from agent
                this.callbacks.onMessage(data.content);
            } else if (data.type === 'status') {
                // Status update
                this.callbacks.onStatus(data);
                
                // If we get a 'connected' status, make sure we consider ourselves connected
                if (data.status === 'connected') {
                    this.connected = true;
                    this.callbacks.onConnected({
                        connectionType: 'websocket',
                        conversationId: this.conversationId
                    });
                } else if (data.status === 'disconnected') {
                    this.connected = false;
                    this.callbacks.onDisconnected({
                        reason: 'agent_disconnected',
                        message: data.message || 'Agent service disconnected'
                    });
                }
            } else if (data.type === 'error') {
                // Error from agent
                this.callbacks.onError(data.content || 'Unknown error from agent');
            } else if (data.type === 'pong') {
                // Pong response (keep-alive)
                this.log('Received pong from agent');
            }
        } catch (error) {
            this.log(`Error parsing WebSocket message: ${error.message}`);
        }
    }
    
    /**
     * Handle WebSocket close event
     */
    onWebSocketClose(event) {
        this.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.connected = false;
        this.stopPingInterval();
        
        if (this.usePolling) {
            // Already using polling, don't try to reconnect WebSocket
            this.log('Not attempting WebSocket reconnect as polling is active');
            return;
        }
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            // Try to reconnect
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
            
            this.callbacks.onStatus({
                status: 'reconnecting',
                message: `WebSocket disconnected. Reconnecting in ${delay / 1000} seconds...`,
                attempt: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts
            });
            
            setTimeout(() => {
                this.connectWebSocket();
            }, delay);
        } else {
            // Max reconnect attempts reached, fall back to polling
            this.log('Max WebSocket reconnect attempts reached, falling back to polling');
            this.callbacks.onStatus({
                status: 'fallback',
                message: 'WebSocket connection failed, falling back to polling...'
            });
            
            this.fallbackToPolling();
        }
    }
    
    /**
     * Handle WebSocket error event
     */
    onWebSocketError(event) {
        this.log('WebSocket error');
        // The error event doesn't contain much useful information
        // The actual error handling will happen in onclose
    }
    
    /**
     * Handle connection failures
     */
    handleConnectionFailure(error) {
        this.log(`Connection failure: ${error.message}`);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            // Try to reconnect
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
            
            this.callbacks.onStatus({
                status: 'reconnecting',
                message: `Connection failed. Retrying in ${delay / 1000} seconds...`,
                attempt: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts
            });
            
            setTimeout(() => {
                this.connectWebSocket();
            }, delay);
        } else {
            // Max reconnect attempts reached, fall back to polling
            this.log('Max reconnect attempts reached, falling back to polling');
            this.callbacks.onStatus({
                status: 'fallback',
                message: 'Connection failed, falling back to polling...'
            });
            
            this.fallbackToPolling();
        }
    }
    
    /**
     * Start the ping interval to keep the WebSocket connection alive
     */
    startPingInterval() {
        this.stopPingInterval(); // Clear any existing interval
        
        this.pingTimer = setInterval(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.log('Sending ping to keep connection alive');
                this.websocket.send(JSON.stringify({
                    type: 'ping'
                }));
            }
        }, this.pingInterval);
    }
    
    /**
     * Stop the ping interval
     */
    stopPingInterval() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }
    
    /**
     * Close the WebSocket connection
     */
    closeWebSocket() {
        this.stopPingInterval();
        
        if (this.websocket) {
            this.log('Closing WebSocket connection');
            
            // Remove event listeners
            this.websocket.onopen = null;
            this.websocket.onmessage = null;
            this.websocket.onclose = null;
            this.websocket.onerror = null;
            
            // Close the connection
            if (this.websocket.readyState === WebSocket.OPEN || 
                this.websocket.readyState === WebSocket.CONNECTING) {
                this.websocket.close();
            }
            
            this.websocket = null;
        }
        
        this.connected = false;
    }
    
    /**
     * Fall back to polling mechanism when WebSocket fails
     */
    fallbackToPolling() {
        this.log('Falling back to polling mechanism');
        this.usePolling = true;
        this.closeWebSocket();
        
        // Notify about the connection method change
        this.callbacks.onConnected({
            connectionType: 'polling',
            conversationId: this.conversationId
        });
        
        // Process any queued messages
        this.processMessageQueue();
        
        // Start polling for new messages
        this.startPolling();
    }
    
    /**
     * Start polling for new messages
     */
    startPolling() {
        this.log('Starting polling for messages');
        
        // Clear any existing polling interval
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        // Start polling every 2 seconds
        this.pollInterval = setInterval(() => {
            this.pollForMessages();
        }, 2000);
    }
    
    /**
     * Stop polling for messages
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    /**
     * Poll for new messages
     */
    async pollForMessages() {
        if (Object.keys(this.pendingMessages).length === 0) {
            // No pending messages to check
            return;
        }
        
        try {
            // Check status of all pending messages
            for (const messageId in this.pendingMessages) {
                const message = this.pendingMessages[messageId];
                
                if (Date.now() - message.timestamp > 30000) {
                    // Message has been pending for more than 30 seconds, consider it failed
                    this.log(`Message ${messageId} timed out`);
                    this.callbacks.onError(`Message timed out: ${message.content.substring(0, 50)}...`);
                    delete this.pendingMessages[messageId];
                    continue;
                }
                
                // Check if there's a response for this message
                await this.checkMessageResponse(messageId);
            }
        } catch (error) {
            this.log(`Error polling for messages: ${error.message}`);
        }
    }
    
    /**
     * Check for a response to a specific message
     */
    async checkMessageResponse(messageId) {
        try {
            const response = await fetch(`${this.baseUrl}${this.apiPath}/api/chat/message/${messageId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                this.log(`Error checking message response: ${response.status}`);
                return;
            }
            
            const data = await response.json();
            
            if (data.status === 'completed' && data.reply) {
                // Message has a response
                this.log(`Received response for message ${messageId}`);
                this.callbacks.onMessage(data.reply);
                delete this.pendingMessages[messageId];
            }
        } catch (error) {
            this.log(`Error checking message response: ${error.message}`);
        }
    }
    
    /**
     * Send a message to the agent
     */
    async sendMessage(message) {
        if (!this.conversationId) {
            throw new Error('No active conversation');
        }
        
        // Add message to queue
        const messageId = this.currentMessageId++;
        
        this.messageQueue.push({
            id: messageId,
            content: message,
            timestamp: Date.now()
        });
        
        this.log(`Queued message ${messageId}: ${message.substring(0, 50)}...`);
        
        // Process the queue
        this.processMessageQueue();
        
        // Return message ID for tracking
        return messageId;
    }
    
    /**
     * Process queued messages
     */
    async processMessageQueue() {
        if (this.messageQueue.length === 0) {
            return;
        }
        
        if (!this.connected && !this.usePolling) {
            this.log('Not connected and not using polling, waiting for connection');
            return;
        }
        
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            
            try {
                if (this.usePolling) {
                    await this.sendMessageViaHttp(message);
                } else {
                    await this.sendMessageViaWebSocket(message);
                }
            } catch (error) {
                this.log(`Error sending message ${message.id}: ${error.message}`);
                this.callbacks.onError(`Failed to send message: ${error.message}`);
            }
        }
    }
    
    /**
     * Send a message via WebSocket
     */
    async sendMessageViaWebSocket(message) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        
        this.log(`Sending message ${message.id} via WebSocket`);
        
        const wsMessage = {
            type: 'message',
            content: message.content
        };
        
        this.websocket.send(JSON.stringify(wsMessage));
    }
    
    /**
     * Send a message via HTTP API and poll for response
     */
    async sendMessageViaHttp(message) {
        this.log(`Sending message ${message.id} via HTTP`);
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('conversation_id', this.conversationId);
            formData.append('message', message.content);
            
            // Send message to agent
            const response = await fetch(`${this.baseUrl}${this.apiPath}/api/chat/message`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.status}`);
            }
            
            const data = await response.json();
            
            // If we got an immediate response, process it
            if (data.reply) {
                this.log(`Received immediate response for message ${message.id}`);
                this.callbacks.onMessage(data.reply);
            } else {
                // Otherwise add to pending messages for polling
                this.log(`Message ${message.id} sent, waiting for response`);
                this.pendingMessages[message.id] = message;
            }
        } catch (error) {
            this.log(`Error sending message via HTTP: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        this.log('Cleaning up resources');
        this.closeWebSocket();
        this.stopPolling();
        this.messageQueue = [];
        this.pendingMessages = {};
        this.connected = false;
        this.conversationId = null;
    }
}

// Add to global namespace
window.EnhancedAgentConnection = EnhancedAgentConnection;