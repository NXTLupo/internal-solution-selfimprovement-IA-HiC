/**
 * Enhanced debugging version of chatbot.js
 * Copy this to your browser console to enable verbose logging
 */

// Patch the WebSocket send method to log messages
if (window.chatbot && window.chatbot.socket) {
  const originalSend = window.chatbot.socket.send;
  window.chatbot.socket.send = function(data) {
    console.log('🔵 WebSocket SEND:', data);
    return originalSend.call(this, data);
  };
  console.log('✅ WebSocket send method patched with logging');
} else {
  console.log('❌ ChatBot or WebSocket not found yet');
}

// Create a more verbose version of sendMessage
if (window.chatbot) {
  const originalSendMessage = window.chatbot.sendMessage;
  window.chatbot.sendMessage = function() {
    console.log('🟢 ChatBot sending message:', this.chatInput.value);
    console.log('🟢 WebSocket state:', this.socket ? this.socket.readyState : 'No socket');
    console.log('🟢 Message queue length:', this.messageQueue.length);
    
    const result = originalSendMessage.apply(this, arguments);
    
    // Check what happened after send
    setTimeout(() => {
      console.log('🟡 WebSocket state after send:', this.socket ? this.socket.readyState : 'No socket');
      console.log('🟡 Message queue length after send:', this.messageQueue.length);
    }, 100);
    
    return result;
  };
  console.log('✅ ChatBot sendMessage method patched with logging');
} else {
  console.log('❌ ChatBot not found yet');
}

// Create a more verbose version of initWebSocket
if (window.chatbot) {
  const originalInitWebSocket = window.chatbot.initWebSocket;
  window.chatbot.initWebSocket = async function() {
    console.log('🟣 ChatBot initializing WebSocket...');
    
    try {
      // Get WebSocket URL
      const response = await fetch(`${this.baseUrl}/api/chat/ws/${this.conversationId}`);
      const data = await response.json();
      console.log('🟣 WebSocket URL data:', data);
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBaseUrl = window.location.host;
      
      // Use the correct URL format
      const wsUrl = data.ws_url.startsWith("ws") 
        ? data.ws_url 
        : `${wsProtocol}//${wsBaseUrl}${data.ws_url}`;
      
      console.log('🟣 Constructed WebSocket URL:', wsUrl);
      
      // Create WebSocket
      this.socket = new WebSocket(wsUrl);
      console.log('🟣 WebSocket created');
      
      // Enhanced WebSocket event handlers
      this.socket.onopen = (event) => {
        console.log('🟣 WebSocket OPEN event:', event);
        
        // Process any queued messages
        if (this.messageQueue.length > 0) {
          console.log('🟣 Processing queued messages:', this.messageQueue);
          this.messageQueue.forEach(message => {
            console.log('🟣 Sending queued message:', message);
            this.socket.send(JSON.stringify(message));
          });
          this.messageQueue = [];
        }
      };
      
      this.socket.onmessage = (event) => {
        console.log('🟣 WebSocket MESSAGE received:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('🟣 Parsed message data:', data);
          
          if (data.type === 'message') {
            console.log('🟣 Received message from assistant');
            this.hideTypingIndicator();
            this.addMessage('assistant', data.content);
            this.scrollToBottom();
          } else if (data.type === 'error') {
            console.log('🟣 Received error message:', data.content);
            this.hideTypingIndicator();
            this.addErrorMessage(data.content);
            this.scrollToBottom();
          } else if (data.type === 'status') {
            console.log('🟣 Received status update:', data.status);
          } else if (data.type === 'pong') {
            console.log('🟣 Received pong (keep-alive)');
          } else {
            console.log('🟣 Received unknown message type:', data.type);
          }
        } catch (error) {
          console.error('🔴 Error parsing WebSocket message:', error, event.data);
        }
      };
      
      this.socket.onclose = (event) => {
        console.log('🟣 WebSocket CLOSE event:', event);
        // Try to reconnect after a delay
        setTimeout(() => {
          if (this.isOpen && !this.socket) {
            console.log('🟣 Attempting to reconnect WebSocket...');
            this.initWebSocket();
          }
        }, 3000);
      };
      
      this.socket.onerror = (error) => {
        console.error('🔴 WebSocket ERROR:', error);
        this.socket = null;
      };
      
    } catch (error) {
      console.error('🔴 Error initializing WebSocket:', error);
    }
  };
  console.log('✅ ChatBot initWebSocket method patched with logging');
} else {
  console.log('❌ ChatBot not found yet');
}

// Queue a test message to be sent when the WebSocket opens
if (window.chatbot) {
  // Force a new socket connection
  if (window.chatbot.socket) {
    window.chatbot.socket.close();
    window.chatbot.socket = null;
  }
  
  console.log('🟢 Reinitializing WebSocket connection...');
  window.chatbot.initWebSocket();
  
  // Add a test message to the chat after 3 seconds
  setTimeout(() => {
    console.log('🟢 Adding test system message...');
    window.chatbot.addSystemMessage('WebSocket debug mode enabled. Check console for logs.');
  }, 3000);
} else {
  console.log('❌ ChatBot not found yet');
}

// Check DOM elements
console.log('🟢 ChatBot DOM elements status:');
if (window.chatbot) {
  console.log('ChatInput exists:', !!window.chatbot.chatInput);
  console.log('SendButton exists:', !!window.chatbot.sendButton);
  console.log('ChatBody exists:', !!window.chatbot.chatBody);
  console.log('Widget exists:', !!window.chatbot.widget);
  
  // Check event listeners
  const hasSendClickListener = window.chatbot.sendButton && 
    window.chatbot.sendButton.onclick !== null;
  console.log('SendButton has click listener:', hasSendClickListener);
  
  const hasInputListener = window.chatbot.chatInput && 
    window.chatbot.chatInput.oninput !== null;
  console.log('ChatInput has input listener:', hasInputListener);
} else {
  console.log('ChatBot not initialized yet');
}

// Install a function to force a test message
window.testChatbotMessage = function(message) {
  console.log('🟢 Testing chatbot with message:', message);
  if (!window.chatbot) {
    console.error('❌ ChatBot not initialized');
    return;
  }
  
  if (!window.chatbot.chatInput) {
    console.error('❌ ChatInput not found');
    return;
  }
  
  // Set the input value
  window.chatbot.chatInput.value = message || 'This is a test message from debug script';
  
  // Trigger the send function
  window.chatbot.sendMessage();
  
  return 'Test message sent - check console for logs';
};

console.log('✅ Debug script installed. Call window.testChatbotMessage() to test the chatbot.');
console.log('Example: window.testChatbotMessage("Hello there")');