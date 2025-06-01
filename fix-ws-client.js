/**
 * WebSocket Connection Fallback for NXT HUMANS AI CX Workbench
 * This script fixes WebSocket disconnection issues by providing a robust
 * fallback mechanism that detects failures and switches connection methods.
 */

(function() {
  console.log('🔄 WebSocket Connection Fallback initializing...');

  // Store original WebSocket implementation
  const OriginalWebSocket = window.WebSocket;

  // Configuration
  const CONFIG = {
    maxRetries: 3,
    retryDelay: 1000,
    directModeEnabled: false,
    debug: true,
    proxyPath: '/ws-proxy/',
    directPath: '/ws/',
    pingInterval: 15000
  };

  // Connection state
  let connectionStats = {
    attempts: 0,
    failures: 0,
    reconnects: 0,
    mode: 'proxy' // 'proxy' or 'direct'
  };

  // Intercept WebSocket constructor
  window.WebSocket = function(url, protocols) {
    console.log(`🔄 WebSocket interception: ${url}`);
    
    // Check if this is a chatbot WebSocket connection
    if (url.includes('/ws-proxy/') || url.includes('/ws/')) {
      const conversationId = url.split('/').pop();
      console.log(`🔄 Chatbot WebSocket detected for conversation: ${conversationId}`);
      
      // Decide which connection method to use
      if (CONFIG.directModeEnabled || connectionStats.failures >= CONFIG.maxRetries) {
        // Use direct connection to agent
        connectionStats.mode = 'direct';
        
        // Replace proxy path with direct path if needed
        if (url.includes('/ws-proxy/')) {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const baseUrl = window.location.host;
          const directUrl = `ws://172.18.0.17:8500/ws/${conversationId}`;
          url = directUrl;
          console.log(`🔄 Switching to direct connection: ${url}`);
        }
      } else {
        connectionStats.mode = 'proxy';
      }
      
      // Create WebSocket with original constructor
      const ws = new OriginalWebSocket(url, protocols);
      connectionStats.attempts++;
      
      // Add enhanced error handling
      const originalOnError = ws.onerror;
      ws.onerror = function(event) {
        console.error(`❌ WebSocket error in ${connectionStats.mode} mode:`, event);
        connectionStats.failures++;
        
        // If in proxy mode and maxRetries exceeded, suggest direct mode
        if (connectionStats.mode === 'proxy' && connectionStats.failures >= CONFIG.maxRetries) {
          console.log(`🔄 Switching to direct connection mode after ${CONFIG.maxRetries} failures`);
          CONFIG.directModeEnabled = true;
          
          // Show notification to user
          showNotification('Connection issues detected. Switching to direct connection mode.');
        }
        
        // Call original handler if exists
        if (originalOnError) originalOnError.call(ws, event);
      };
      
      // Add connection close handler
      const originalOnClose = ws.onclose;
      ws.onclose = function(event) {
        console.log(`🔄 WebSocket closed in ${connectionStats.mode} mode with code ${event.code}`);
        
        // If abnormal closure, increment failures
        if (event.code !== 1000 && event.code !== 1001) {
          connectionStats.failures++;
          
          // If in proxy mode and this was an abnormal closure, try direct mode
          if (connectionStats.mode === 'proxy' && event.code === 1006) {
            console.log('🔄 Abnormal closure detected, recommend direct mode for next connection');
            CONFIG.directModeEnabled = true;
            
            // Show notification to user
            showNotification('Connection closed unexpectedly. Will try direct connection next time.');
          }
        }
        
        // Call original handler if exists
        if (originalOnClose) originalOnClose.call(ws, event);
      };
      
      // Enhanced open handler
      const originalOnOpen = ws.onopen;
      ws.onopen = function(event) {
        console.log(`✅ WebSocket connected in ${connectionStats.mode} mode`);
        
        // Reset failures on successful connection
        if (connectionStats.mode === 'direct') {
          // If direct mode works, remember this preference
          localStorage.setItem('preferDirectConnection', 'true');
          showNotification('Connected using direct mode successfully.');
        }
        
        // Setup ping interval to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === ws.OPEN) {
            console.log('🔄 Sending ping to keep connection alive');
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch (err) {
              console.error('❌ Error sending ping:', err);
              clearInterval(pingInterval);
            }
          } else {
            // Stop pinging if socket is closed
            clearInterval(pingInterval);
          }
        }, CONFIG.pingInterval);
        
        // Call original handler if exists
        if (originalOnOpen) originalOnOpen.call(ws, event);
      };
      
      // Enhanced message handler for debugging
      if (CONFIG.debug) {
        const originalOnMessage = ws.onmessage;
        ws.onmessage = function(event) {
          try {
            const data = JSON.parse(event.data);
            console.log(`📥 WebSocket message received (${connectionStats.mode} mode):`, 
              data.type === 'message' ? `[${data.type}] ${data.content.substring(0, 50)}...` : data);
            
            // Special handling for status messages
            if (data.type === 'status') {
              console.log(`🔄 Status update: ${data.status} - ${data.message}`);
            }
          } catch (e) {
            console.log(`📥 WebSocket message received (${connectionStats.mode} mode): non-JSON data`);
          }
          
          // Call original handler if exists
          if (originalOnMessage) originalOnMessage.call(ws, event);
        };
      }
      
      return ws;
    }
    
    // For non-chatbot WebSockets, use original behavior
    return new OriginalWebSocket(url, protocols);
  };

  // Copy properties from original WebSocket
  for (const prop in OriginalWebSocket) {
    if (OriginalWebSocket.hasOwnProperty(prop)) {
      window.WebSocket[prop] = OriginalWebSocket[prop];
    }
  }
  // Copy prototype
  window.WebSocket.prototype = OriginalWebSocket.prototype;

  // Helper to show notifications to the user
  function showNotification(message) {
    // Check if notification element exists
    let notificationElement = document.getElementById('ws-notification');
    
    // Create if doesn't exist
    if (!notificationElement) {
      notificationElement = document.createElement('div');
      notificationElement.id = 'ws-notification';
      notificationElement.style.cssText = `
        position: fixed;
        bottom: 75px;
        right: 20px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 10000;
        font-family: sans-serif;
        font-size: 14px;
        max-width: 300px;
      `;
      document.body.appendChild(notificationElement);
    }
    
    // Update content and show
    notificationElement.textContent = message;
    notificationElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      notificationElement.style.display = 'none';
    }, 5000);
  }

  // Helper function to force direct connection mode
  window.useDirectConnection = function() {
    CONFIG.directModeEnabled = true;
    localStorage.setItem('preferDirectConnection', 'true');
    console.log('🔄 Direct connection mode enabled for future connections');
    showNotification('Direct connection mode enabled for future connections');
    return 'Direct connection mode enabled';
  };

  // Helper function to force proxy connection mode
  window.useProxyConnection = function() {
    CONFIG.directModeEnabled = false;
    localStorage.removeItem('preferDirectConnection');
    console.log('🔄 Proxy connection mode enabled for future connections');
    showNotification('Proxy connection mode enabled for future connections');
    return 'Proxy connection mode enabled';
  };

  // Helper function to check connection status
  window.checkConnection = function() {
    console.log('🔄 Connection statistics:', connectionStats);
    return connectionStats;
  };

  // Add helper function to window for reconnecting existing chatbot
  window.fixChatbotConnection = function() {
    if (window.chatbot) {
      console.log("Fixing chatbot WebSocket connection...");
      
      // Close existing connection
      if (window.chatbot.socket) {
        console.log("Closing existing socket connection");
        window.chatbot.socket.close();
        window.chatbot.socket = null;
      }
      
      // Force refresh connection
      setTimeout(() => {
        console.log("Initializing new WebSocket connection");
        window.chatbot.initWebSocket();
      }, 500);
      
      return "Chatbot connection fix initiated. Check console for details.";
    } else {
      console.error("Chatbot instance not found!");
      return "Error: Chatbot instance not found!";
    }
  };

  // Check if we have a stored preference
  if (localStorage.getItem('preferDirectConnection') === 'true') {
    CONFIG.directModeEnabled = true;
    console.log('🔄 Using direct connection mode based on stored preference');
  }

  console.log('✅ WebSocket Connection Fallback initialized');
  showNotification('WebSocket connection enhancement active');
})();