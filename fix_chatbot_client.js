/**
 * Fix for the chatbot client - addressing message duplication issue
 */

// The problem is that the client shows a static welcome message AND 
// also receives the dynamic welcome from the server, causing confusion.
// We'll modify the chatbot.js to handle WebSocket messages properly.

// Find the initWebSocket method and fix the message handling
const originalCode = `  async initWebSocket() {
    console.log('ChatbotWidget.initWebSocket() called');
    try {
      // Get WebSocket URL
      console.log(\`Fetching WebSocket URL for conversation \${this.conversationId}...\`);
      const response = await fetch(\`\${this.baseUrl}/api/chat/ws/\${this.conversationId}\`);
      const data = await response.json();
      console.log('WebSocket URL response:', data);

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBaseUrl = window.location.host;
      console.log(\`WebSocket protocol: \${wsProtocol}, base URL: \${wsBaseUrl}\`);

      // Use the ws_url from the server response if available, otherwise construct default URL
      let wsUrl;
      if (data.ws_url && data.ws_url.startsWith('/')) {
        // Server returned a relative path
        wsUrl = \`\${wsProtocol}//\${wsBaseUrl}\${data.ws_url}\`;
      } else if (data.ws_url && (data.ws_url.startsWith('ws://') || data.ws_url.startsWith('wss://'))) {
        // Server returned a full URL
        wsUrl = data.ws_url;
      } else {
        // Fallback to default construction
        wsUrl = \`\${wsProtocol}//\${wsBaseUrl}/ws-proxy/\${this.conversationId}\`;
      }
      console.log(\`Constructed WebSocket URL: \${wsUrl}\`);
      
      // Create WebSocket
      console.log('Creating WebSocket...');
      this.socket = new WebSocket(wsUrl);`;

const fixedCode = `  async initWebSocket() {
    console.log('ChatbotWidget.initWebSocket() called');
    try {
      // Get WebSocket URL
      console.log(\`Fetching WebSocket URL for conversation \${this.conversationId}...\`);
      const response = await fetch(\`\${this.baseUrl}/api/chat/ws/\${this.conversationId}\`);
      const data = await response.json();
      console.log('WebSocket URL response:', data);

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBaseUrl = window.location.host;
      console.log(\`WebSocket protocol: \${wsProtocol}, base URL: \${wsBaseUrl}\`);

      // Use the ws_url from the server response if available, otherwise construct default URL
      let wsUrl;
      if (data.ws_url && data.ws_url.startsWith('/')) {
        // Server returned a relative path
        wsUrl = \`\${wsProtocol}//\${wsBaseUrl}\${data.ws_url}\`;
      } else if (data.ws_url && (data.ws_url.startsWith('ws://') || data.ws_url.startsWith('wss://'))) {
        // Server returned a full URL
        wsUrl = data.ws_url;
      } else {
        // Fallback to default construction
        wsUrl = \`\${wsProtocol}//\${wsBaseUrl}/ws-proxy/\${this.conversationId}\`;
      }
      console.log(\`Constructed WebSocket URL: \${wsUrl}\`);
      
      // Create WebSocket
      console.log('Creating WebSocket...');
      this.socket = new WebSocket(wsUrl);
      
      // Flag to track if initial message was received
      this.initialMessageReceived = false;`;

// Also fix the createConversation method to not add a local welcome message
const originalCreateConversation = `  async createConversation() {
    console.log('ChatbotWidget.createConversation() called');
    try {
      const response = await fetch(\`\${this.baseUrl}/api/chat/conversation\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(\`Failed to create conversation: \${response.status} \${response.statusText}\`);
      }
      
      const data = await response.json();
      this.conversationId = data.conversation_id;
      console.log(\`Conversation created with ID: \${this.conversationId}\`);
      
      // Add welcome message
      setTimeout(() => {
        this.addMessage('assistant', 'Hello! I\\'m your CX Workbench Assistant. I can help you with Reddit data collection, social media analysis, and customer journey mapping. How can I assist you today?');
      }, 500);
      
      // Initialize WebSocket
      this.initWebSocket();`;

const fixedCreateConversation = `  async createConversation() {
    console.log('ChatbotWidget.createConversation() called');
    try {
      const response = await fetch(\`\${this.baseUrl}/api/chat/conversation\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(\`Failed to create conversation: \${response.status} \${response.statusText}\`);
      }
      
      const data = await response.json();
      this.conversationId = data.conversation_id;
      console.log(\`Conversation created with ID: \${this.conversationId}\`);
      
      // Don't add static welcome message here - will get it from WebSocket
      
      // Initialize WebSocket
      this.initWebSocket();`;

// Also fix the onmessage handler
const originalOnMessage = `      this.socket.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
            console.log('Received assistant message');
            // Hide typing indicator and add message
            this.hideTypingIndicator();
            this.addMessage('assistant', data.content);
            this.scrollToBottom();`;

const fixedOnMessage = `      this.socket.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
            console.log('Received assistant message');
            // Hide typing indicator and add message
            this.hideTypingIndicator();
            
            // Track if first message has been received
            if (!this.initialMessageReceived) {
              console.log('Received initial welcome message from server');
              this.initialMessageReceived = true;
            }
            
            this.addMessage('assistant', data.content);
            this.scrollToBottom();`;

// Generate the fix script
console.log(`
// Create backup of the original file
const fs = require('fs');
const path = require('path');

const chatbotJsPath = path.join('/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/static', 'chatbot.js');
const backupPath = path.join('/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/static', 'chatbot.js.backup');

// Create backup
fs.copyFileSync(chatbotJsPath, backupPath);
console.log(\`Created backup at \${backupPath}\`);

// Read file
let content = fs.readFileSync(chatbotJsPath, 'utf8');

// Apply fixes
content = content.replace(${JSON.stringify(originalCode)}, ${JSON.stringify(fixedCode)});
content = content.replace(${JSON.stringify(originalCreateConversation)}, ${JSON.stringify(fixedCreateConversation)});
content = content.replace(${JSON.stringify(originalOnMessage)}, ${JSON.stringify(fixedOnMessage)});

// Write fixed file
fs.writeFileSync(chatbotJsPath, content);
console.log(\`Updated \${chatbotJsPath}\`);

console.log('Fix completed successfully!');
`);