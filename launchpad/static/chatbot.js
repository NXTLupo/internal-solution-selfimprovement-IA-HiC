console.log('=== CHATBOT.JS IS LOADING - VERSION 3.0 ===');
console.log('=== FILE UPLOAD FIX APPLIED ===');

/**
 * Chatbot Widget for NXT Humans AI CX Workbench
 * Enables conversation with AI assistant using MCP-based tools
 * DEBUG VERSION with console.log statements
 */

class ChatbotWidget {
  constructor() {
    console.log('ChatbotWidget initializing...');
    this.conversationId = null;
    this.isOpen = false;
    this.isMinimized = false;
    this.isTyping = false;
    this.baseUrl = window.location.origin;
    this.fileUpload = null;
    this.ws = null;
    this.wsConnected = false;
    this._firstMessageReceived = false;
    this._accumulatedText = '';
    this._inferenceStart = null;
    
    // Initialization
    this.init();
  }
  
  /**
   * Initialize the chatbot widget
   */
  init() {
    console.log('ChatbotWidget.init() called');
    // Create DOM elements
    this.createWidgetDom();
    
    // Add event listeners
    this.addEventListeners();
    
    // Create a new conversation
    this.createConversation();
  }
  
  /**
   * Create the DOM elements for the widget
   */
  createWidgetDom() {
    console.log('ChatbotWidget.createWidgetDom() called');
    // Launch button
    const launchButton = document.createElement('button');
    launchButton.className = 'chat-launch-button';
    launchButton.innerHTML = '<i class="fa-solid fa-message"></i>';
    launchButton.setAttribute('aria-label', 'Open chat');
    document.body.appendChild(launchButton);
    this.launchButton = launchButton;
    
    // Main widget container
    const widget = document.createElement('div');
    widget.className = 'chatbot-widget hidden';
    widget.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="chat-header-icon">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div class="chat-header-title">NXT Intelligence Agent</div>
        </div>
        <div class="chat-header-actions">
          <button class="chat-header-button minimize-button" aria-label="Minimize chat">
            <i class="fa-solid fa-minus"></i>
          </button>
          <button class="chat-header-button close-button" aria-label="Close chat">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div class="chat-body"></div>
      <div class="chat-footer">
        <div class="chat-actions">
          <label class="chat-action-button file-upload-label" aria-label="Upload file">
            <i class="fa-solid fa-paperclip"></i>
            <input type="file" class="file-input" accept="image/*,.pdf,.csv,.txt,.json,.md,.xml,.html,.xlsx,.docx">
          </label>
        </div>
        <div class="chat-input">
          <textarea 
            class="chat-input-textarea" 
            placeholder="Type a message..." 
            rows="1"
            aria-label="Chat message input"
          ></textarea>
        </div>
        <button class="chat-send-button" disabled aria-label="Send message">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    `;
    document.body.appendChild(widget);
    this.widget = widget;
    
    // Store references to DOM elements
    this.chatBody = widget.querySelector('.chat-body');
    this.chatInput = widget.querySelector('.chat-input-textarea');
    this.sendButton = widget.querySelector('.chat-send-button');
    this.minimizeButton = widget.querySelector('.minimize-button');
    this.closeButton = widget.querySelector('.close-button');
    this.fileInput = widget.querySelector('.file-input');
    console.log('ChatbotWidget DOM elements created');
  }
  
  /**
   * Add event listeners to the widget elements
   */
  addEventListeners() {
    console.log('ChatbotWidget.addEventListeners() called');
    // Launch button
    this.launchButton.addEventListener('click', () => {
      console.log('Launch button clicked');
      this.openChat();
    });
    
    // Header actions
    this.widget.querySelector('.chat-header').addEventListener('click', (e) => {
      if (!e.target.closest('.chat-header-actions')) {
        if (this.isMinimized) {
          console.log('Chat header clicked while minimized');
          this.maximizeChat();
        }
      }
    });
    
    this.minimizeButton.addEventListener('click', () => {
      console.log('Minimize button clicked');
      if (this.isMinimized) {
        this.maximizeChat();
      } else {
        this.minimizeChat();
      }
    });
    
    this.closeButton.addEventListener('click', () => {
      console.log('Close button clicked');
      this.closeChat();
    });
    
    // Send message
    this.sendButton.addEventListener('click', () => {
      console.log('Send button clicked');
      this.sendMessage();
    });
    
    // Enter key to send
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        console.log('Enter key pressed in chat input');
        e.preventDefault();
        if (this.chatInput.value.trim()) {
          this.sendMessage();
        }
      }
      
      // Auto-resize input
      this.resizeInput();
    });
    
    // Input events
    this.chatInput.addEventListener('input', () => {
      this.sendButton.disabled = !this.chatInput.value.trim();
      this.resizeInput();
    });
    
    // File upload
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        const selectedFile = e.target.files[0];
        console.log('File selected:', selectedFile.name);
        console.log('DEBUG: Initial file selection details:', {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          lastModified: selectedFile.lastModified
        });
        this.handleFileUpload(selectedFile);
      }
    });
    console.log('All event listeners added');
  }
  
  /**
   * Suggested prompt sets that rotate every 12 seconds
   */
  _promptSets = [
    [
      "I need a customer journey map from some interview transcripts",
      "I want to collect Reddit posts about a product for analysis",
      "I need a video transcribed from YouTube",
    ],
    [
      "I want to run sentiment analysis on a subreddit",
      "I need to create consistent characters and a video clip",
      "I want to build a Copilot Studio agent recipe",
    ],
    [
      "I have a PDF of customer support tickets I need analyzed",
      "I want to convert a journey map into a Miro board",
      "I need to research what people are saying about a brand on Reddit",
    ],
    [
      "I want to create a scene with consistent characters for a campaign",
      "I have call transcripts I need turned into a journey map",
      "I need TrustPilot reviews collected for a competitor",
    ],
    [
      "I want to analyze Reddit sentiment about our new feature launch",
      "I need a video transcription with timestamps from a customer call",
      "I want to generate a visual journey map from survey responses",
    ],
  ];
  _promptSetIndex = 0;
  _promptRotationTimer = null;

  showSuggestedPrompts() {
    // Create prompt container if it doesn't exist
    let container = this.chatBody.querySelector('.suggested-prompts-widget');
    if (!container) {
      container = document.createElement('div');
      container.className = 'suggested-prompts-widget';
      container.style.cssText = 'padding:8px 12px;';
      const label = document.createElement('div');
      label.style.cssText = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#acacac;margin-bottom:6px;';
      label.textContent = 'Try a prompt';
      container.appendChild(label);
      const chips = document.createElement('div');
      chips.className = 'prompt-chips-area';
      chips.style.cssText = 'display:flex;flex-direction:column;gap:6px;transition:opacity 0.3s ease;';
      container.appendChild(chips);
      this.chatBody.appendChild(container);
    }

    const chips = container.querySelector('.prompt-chips-area');
    const set = this._promptSets[this._promptSetIndex % this._promptSets.length];
    chips.innerHTML = '';
    set.forEach(text => {
      const chip = document.createElement('button');
      chip.style.cssText = 'font-family:inherit;font-size:11px;font-weight:400;color:#525252;background:#fafafa;border:1px solid #e5e5e5;border-radius:2px;padding:7px 10px;cursor:pointer;text-align:left;line-height:1.3;transition:border-color 0.15s;';
      chip.textContent = text;
      chip.addEventListener('mouseenter', () => { chip.style.borderColor = '#115054'; chip.style.color = '#115054'; });
      chip.addEventListener('mouseleave', () => { chip.style.borderColor = '#e5e5e5'; chip.style.color = '#525252'; });
      chip.addEventListener('click', () => {
        this.chatInput.value = text;
        this.chatInput.focus();
        this.sendButton.disabled = false;
        this.hideSuggestedPrompts();
      });
      chips.appendChild(chip);
    });

    // Start rotation
    if (this._promptRotationTimer) clearInterval(this._promptRotationTimer);
    this._promptRotationTimer = setInterval(() => {
      this._promptSetIndex++;
      const chipsEl = this.chatBody.querySelector('.prompt-chips-area');
      if (chipsEl) {
        chipsEl.style.opacity = '0';
        setTimeout(() => {
          this.showSuggestedPrompts();
          const refreshed = this.chatBody.querySelector('.prompt-chips-area');
          if (refreshed) refreshed.style.opacity = '1';
        }, 300);
      }
    }, 12000);

    this.scrollToBottom();
  }

  hideSuggestedPrompts() {
    if (this._promptRotationTimer) { clearInterval(this._promptRotationTimer); this._promptRotationTimer = null; }
    const container = this.chatBody.querySelector('.suggested-prompts-widget');
    if (container) container.remove();
  }

  /**
   * Resize the input textarea based on content
   */
  resizeInput() {
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
  }
  
  /**
   * Create a new conversation
   */
  async createConversation() {
    console.log('ChatbotWidget.createConversation() called');
    try {
      const response = await fetch(`${this.baseUrl}/api/mcp/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.conversationId = data.conversation_id;
      console.log(`Conversation created with ID: ${this.conversationId}`);

      // Add welcome message
      this.addMessage('assistant', 'I\'m the NXT Intelligence Agent. Tell me what you need and I\'ll handle it.\n\nI can operate all Intelligence Augmentation apps for you:\n\n-- Journey Mapper -- turn transcripts, surveys, or support data into journey maps\n-- Social Data Collector -- collect Reddit posts, TrustPilot reviews, or Play Store reviews\n-- Video Transcriber -- transcribe YouTube videos or uploaded audio/video\n-- Social Research -- run sentiment analysis and topic modeling on Reddit data\n-- Character Generator -- create consistent characters, scenes, and video clips\n-- Copilot Recipe Builder -- generate Copilot Studio agent build recipes\n-- Miro Board Generator -- convert journey maps into Miro or Figma boards\n\nJust tell me what you need and I\'ll ask for the details. You can also upload files at any point.');
      // Show rotating suggested prompts
      this.showSuggestedPrompts();

      // Connect WebSocket for streaming with live screenshots
      this.connectWebSocket();
    } catch (error) {
      console.error('Error creating conversation:', error);
      this.addErrorMessage('Failed to start conversation. Please try again later.');
    }
  }
  
  /**
   * Add timeout handling for long-running operations
   */
  addTimeoutMessage() {
    this.addMessage('system', 'This operation is taking longer than usual. Please wait while we process your request...');
  }

  /**
   * Connect WebSocket for real-time streaming with live screenshots
   */
  connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws-proxy/${this.conversationId}`;

    console.log('Connecting WebSocket:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.wsConnected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWsEvent(data);
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.wsConnected = false;
      // Reconnect after 3 seconds if we still have a conversation
      if (this.conversationId) {
        setTimeout(() => this.connectWebSocket(), 3000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    // Keepalive ping every 15 seconds
    if (this._pingInterval) clearInterval(this._pingInterval);
    this._pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
  }

  /**
   * Handle incoming WebSocket events from the streaming agent
   */
  handleWsEvent(data) {
    const type = data.type;

    if (type === 'message' && !this._firstMessageReceived) {
      // Welcome message from server -- skip since we show our own
      this._firstMessageReceived = true;
      return;
    }

    if (type === 'tool_start') {
      this.updateTypingStatus(data.description || `Using ${data.tool}...`);
      this.addSystemMessage(`> ${data.description || data.tool}`);
      // Show live browser panel when computer use starts
      if (data.tool === 'computer') {
        this.showBrowserPanel();
      }
    }
    else if (type === 'screenshot') {
      // Show the screenshot inline in the chat
      this.hideTypingIndicator();
      this.addScreenshot(data.image, data.url || '');
      this.showTypingIndicator();
      this.updateTypingStatus('Analyzing screenshot...');
    }
    else if (type === 'tool_result') {
      this.updateTypingStatus(`${data.tool} completed`);
    }
    else if (type === 'tool_error') {
      this.addSystemMessage(`Tool error (${data.tool}): ${data.error}`);
    }
    else if (type === 'text_delta') {
      // Accumulate text deltas for the final message
      if (!this._accumulatedText) this._accumulatedText = '';
      this._accumulatedText += data.content;
    }
    else if (type === 'status') {
      this.updateTypingStatus(data.message || 'Working...');
    }
    else if (type === 'message_complete') {
      // Final response — hide browser panel if open
      this.hideBrowserPanel();
      this.hideTypingIndicator();
      if (this._statusTimers) this._statusTimers.forEach(t => clearTimeout(t));

      const elapsed = this._inferenceStart ? ((Date.now() - this._inferenceStart) / 1000).toFixed(1) : '?';
      const tools = data.tools_used || [];
      if (tools.length > 0) {
        this.addSystemMessage(`Tools: ${tools.join(', ')} | ${data.turns || '?'} turns | ${elapsed}s`);
      }

      if (this._accumulatedText) {
        this.addMessage('assistant', this._accumulatedText);
      }
      this._accumulatedText = '';
      this.sendButton.disabled = !this.chatInput.value.trim();
      this._inferenceStart = null;
    }
    else if (type === 'error') {
      this.hideTypingIndicator();
      if (this._statusTimers) this._statusTimers.forEach(t => clearTimeout(t));
      this.addErrorMessage(data.content || 'An error occurred');
      this.sendButton.disabled = false;
      this._inferenceStart = null;
    }
    else if (type === 'pong') {
      // Keepalive response, ignore
    }
  }

  /**
   * Add a browser screenshot inline in the chat
   * @param {string} base64Data - Base64-encoded PNG image data
   * @param {string} url - The URL the screenshot was taken from
   */
  addScreenshot(base64Data, url) {
    const container = document.createElement('div');
    container.style.cssText = 'margin:8px 0;padding:8px;background:#f5f5f5;border:1px solid #e5e5e5;border-radius:4px;';

    if (url) {
      const urlLabel = document.createElement('div');
      urlLabel.style.cssText = 'font-size:10px;color:#acacac;font-family:monospace;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      urlLabel.textContent = url;
      container.appendChild(urlLabel);
    }

    const img = document.createElement('img');
    img.src = `data:image/png;base64,${base64Data}`;
    img.style.cssText = 'width:100%;border-radius:2px;border:1px solid #e5e5e5;';
    img.alt = 'Browser screenshot';
    container.appendChild(img);

    this.chatBody.appendChild(container);
    this.scrollToBottom();
  }

  /**
   * Show live browser viewport panel via noVNC
   */
  showBrowserPanel() {
    if (document.getElementById('nxt-browser-panel')) return; // Already showing

    const panel = document.createElement('div');
    panel.id = 'nxt-browser-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 470px;
      width: 680px;
      height: 460px;
      background: #141414;
      border: 1px solid #115054;
      border-radius: 4px;
      z-index: 10001;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#115054;color:#ffffff;font-family:Archivo,sans-serif;font-size:12px;font-weight:500;';
    header.innerHTML = `
      <span style="display:flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;background:#0CCE6B;border-radius:50%;animation:pulse 2s infinite;"></span>
        LIVE BROWSER -- Agent Computer Use
      </span>
      <button id="nxt-browser-close" style="background:none;border:none;color:#ffffff;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
    `;
    panel.appendChild(header);

    const iframe = document.createElement('iframe');
    iframe.src = `http://${window.location.hostname}:6080/vnc.html?autoconnect=true&resize=scale&view_only=true`;
    iframe.style.cssText = 'width:100%;height:calc(100% - 36px);border:none;background:#000;';
    iframe.allow = 'clipboard-read; clipboard-write';
    panel.appendChild(iframe);

    document.body.appendChild(panel);

    // Close button
    document.getElementById('nxt-browser-close').addEventListener('click', () => this.hideBrowserPanel());

    // Add pulse animation if not already added
    if (!document.getElementById('nxt-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'nxt-pulse-style';
      style.textContent = '@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }';
      document.head.appendChild(style);
    }

    this.addSystemMessage('> Live browser viewport opened -- watch the agent operate your apps');
  }

  /**
   * Hide the live browser panel
   */
  hideBrowserPanel() {
    const panel = document.getElementById('nxt-browser-panel');
    if (panel) panel.remove();
  }

  /**
   * Send a message to the assistant
   */
  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message) return;

    console.log(`Sending message: "${message}"`);

    // Hide suggested prompts on first message
    this.hideSuggestedPrompts();

    // Add user message to chat
    this.addMessage('user', message);

    // Clear input
    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';
    this.sendButton.disabled = true;

    // Show typing indicator
    this.showTypingIndicator();
    this._inferenceStart = Date.now();
    this._accumulatedText = '';

    // Scroll to bottom
    this.scrollToBottom();

    // If WebSocket is connected, use it (streaming with live screenshots)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending via WebSocket (streaming mode)');

      // If there is a pending file, send as file message with base64
      if (this.fileUpload) {
        const pendingFile = this.fileUpload;
        this.fileUpload = null;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1]; // Remove data:... prefix
          this.ws.send(JSON.stringify({
            type: 'file',
            content: message,
            file: {
              data: base64,
              name: pendingFile.name,
            }
          }));
        };
        reader.onerror = () => {
          this.addErrorMessage('Failed to read file for upload.');
          this.sendButton.disabled = false;
        };
        reader.readAsDataURL(pendingFile);
      } else {
        this.ws.send(JSON.stringify({ type: 'message', content: message }));
      }
    } else {
      // Fallback to HTTP if WebSocket not connected
      console.log('Sending via HTTP fallback (no WebSocket)');

      // Progressive status updates for HTTP path
      this._statusTimers = [
        setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Routing to tools... (3s)'); }, 3000),
        setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Executing tool calls... (8s)'); }, 8000),
        setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Waiting for service response... (15s)'); }, 15000),
        setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Processing results... (25s)'); }, 25000),
        setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Multi-turn tool execution... (40s)'); }, 40000),
        setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Still working... (60s)'); }, 60000),
        setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Complex operation in progress... (90s)'); }, 90000),
        setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Almost there... (2m)'); }, 120000),
      ];

      try {
        const formData = new FormData();
        formData.append('conversation_id', this.conversationId);
        formData.append('message', message);

        if (this.fileUpload) {
          formData.append('file', this.fileUpload);
          this.fileUpload = null;
        }

        const response = await fetch(`${this.baseUrl}/api/mcp/message`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (this._statusTimers) this._statusTimers.forEach(t => clearTimeout(t));
        const elapsed = ((Date.now() - this._inferenceStart) / 1000).toFixed(1);

        this.hideTypingIndicator();

        const toolCalls = data.tool_calls || [];
        if (toolCalls.length > 0) {
          const toolNames = toolCalls.map(tc => tc.name).filter(Boolean);
          const uniqueTools = [...new Set(toolNames)];
          const turns = data.turns || 1;
          this.addSystemMessage(
            `Tools used: ${uniqueTools.join(', ')} | ${turns} turn${turns > 1 ? 's' : ''} | ${elapsed}s`
          );
        }

        this.addMessage('assistant', data.reply || data.response || 'No response received');
        this.scrollToBottom();

      } catch (error) {
        console.error('Error sending message:', error);
        if (this._statusTimers) this._statusTimers.forEach(t => clearTimeout(t));
        this.hideTypingIndicator();
        if (error.message && error.message.includes('timeout')) {
          this.addErrorMessage('Request timed out. The agent may still be processing -- try again in a moment.');
        } else {
          this.addErrorMessage('Failed to send message. Please try again.');
        }
      }

      this.sendButton.disabled = !this.chatInput.value.trim();
    }
  }
  
  /**
   * Handle file upload
   * @param {File} file - The file to upload
   */
  handleFileUpload(file) {
    console.log('ChatbotWidget.handleFileUpload() called with file:', file.name);
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size);
      this.addErrorMessage(`File is too large. Maximum size is 10MB.`);
      return;
    }
    
    // Check file type
    const acceptedTypes = ['.pdf', '.csv', '.txt', '.json', '.md', '.xml', '.html', '.xlsx', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!acceptedTypes.includes(fileExt)) {
      console.log('Invalid file type:', fileExt);
      this.addErrorMessage(`Invalid file type. Please upload images, PDFs, CSVs, or documents.`);
      return;
    }
    
    // Add file message to chat
    this.addMessage('user', `Uploading file: ${file.name}`, {
      fileName: file.name,
      fileType: file.type
    });
    
    // Store the original file object directly (no base64 conversion)
    this.fileUpload = file;
    
    console.log('Stored original file object:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Prompt user to add a message
    this.addSystemMessage(`File ready to send. Add a message and press send to process this file.`);
    this.chatInput.focus();
  }
  
  /**
   * Add a message to the chat
   * @param {string} role - The message role (user, assistant, system)
   * @param {string} content - The message content
   * @param {Object} fileInfo - Optional file information
   */
  addMessage(role, content, fileInfo = null) {
    // Safety check for content
    if (!content || typeof content !== 'string') {
      content = 'Empty message';
    }
    console.log(`Adding ${role} message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Format message content with markdown-like formatting
    let formattedContent = this.formatMessageContent(content);
    messageDiv.innerHTML = formattedContent;
    
    // Add file attachment if present
    if (fileInfo) {
      console.log('Adding file attachment:', fileInfo.fileName);
      const attachmentDiv = document.createElement('div');
      attachmentDiv.className = 'message-attachment';
      
      // Choose icon based on file type
      let iconClass = 'fa-file';
      if (fileInfo.fileType.includes('pdf')) {
        iconClass = 'fa-file-pdf';
      } else if (fileInfo.fileType.includes('csv') || fileInfo.fileType.includes('excel')) {
        iconClass = 'fa-file-csv';
      } else if (fileInfo.fileType.includes('json')) {
        iconClass = 'fa-file-code';
      } else if (fileInfo.fileType.includes('text')) {
        iconClass = 'fa-file-alt';
      }
      
      attachmentDiv.innerHTML = `
        <div class="message-attachment-icon">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="message-attachment-name">${fileInfo.fileName}</div>
      `;
      
      messageDiv.appendChild(attachmentDiv);
    }
    
    this.chatBody.appendChild(messageDiv);
    this.scrollToBottom();
  }
  
  /**
   * Add a system message to the chat
   * @param {string} content - The message content
   */
  addSystemMessage(content) {
    console.log(`Adding system message: "${content}"`);
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.textContent = content;
    this.chatBody.appendChild(messageDiv);
    this.scrollToBottom();
  }
  
  /**
   * Add an error message to the chat
   * @param {string} content - The error message
   */
  addErrorMessage(content) {
    console.log(`Adding error message: "${content}"`);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = content;
    this.chatBody.appendChild(errorDiv);
    this.scrollToBottom();
  }
  
  /**
   * Format message content with robust markdown-like formatting
   * @param {string} content - The raw message content
   * @returns {string} - The formatted HTML
   */
  formatMessageContent(content) {
    // First, escape any existing HTML to prevent injection
    let processedContent = content;
    
    // Convert code blocks first (protect from other processing)
    const codeBlocks = [];
    processedContent = processedContent.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      const index = codeBlocks.length;
      codeBlocks.push(`<pre>${this.escapeHTML(code.trim())}</pre>`);
      return `__CODE_BLOCK_${index}__`;
    });
    
    // Convert inline code (protect from other processing)
    const inlineCodes = [];
    processedContent = processedContent.replace(/`([^`]+)`/g, (match, code) => {
      const index = inlineCodes.length;
      inlineCodes.push(`<code>${this.escapeHTML(code)}</code>`);
      return `__INLINE_CODE_${index}__`;
    });
    
    // Process markdown links with proper URL validation
    processedContent = processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      // Strict URL cleaning - remove any potential HTML injection
      const cleanUrl = url.trim().replace(/[<>"'\s]/g, '');
      const cleanText = this.escapeHTML(text.trim());
      
      // Validate URL format
      if (!cleanUrl.match(/^https?:\/\//)) {
        return `${cleanText} (${cleanUrl})`;
      }
      
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanText}</a>`;
    });
    
    // Process standalone URLs - with strict matching to prevent corruption
    processedContent = processedContent.replace(/(?<!href="|>)(https?:\/\/[^\s<>"'\]]+)(?![^<]*<\/a>)/g, (match) => {
      // Additional protection: ensure we're not inside an existing link
      const cleanUrl = match.trim().replace(/[<>"'\]]+$/, '');
      
      // Validate URL format
      if (!cleanUrl.match(/^https?:\/\//)) {
        return match;
      }
      
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>`;
    });
    
    // Convert bold
    processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic
    processedContent = processedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert newlines to <br> tags
    processedContent = processedContent.replace(/\n/g, '<br>');
    
    // Restore code blocks
    codeBlocks.forEach((code, index) => {
      processedContent = processedContent.replace(`__CODE_BLOCK_${index}__`, code);
    });
    
    // Restore inline codes
    inlineCodes.forEach((code, index) => {
      processedContent = processedContent.replace(`__INLINE_CODE_${index}__`, code);
    });
    
    return processedContent;
  }
  
  /**
   * Escape HTML special characters
   * @param {string} text - The text to escape
   * @returns {string} - The escaped text
   */
  escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    console.log('Showing typing indicator');
    if (this.isTyping) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span></span><span></span><span></span>
        <span class="typing-status" style="font-size:11px;color:#acacac;font-style:italic;margin-left:4px;">Thinking...</span>
      </div>
    `;
    typingDiv.id = 'typing-indicator';
    this.chatBody.appendChild(typingDiv);
    this.isTyping = true;
    this.scrollToBottom();
  }

  updateTypingStatus(status) {
    const el = document.querySelector('#typing-indicator .typing-status');
    if (el) {
      el.textContent = status;
      this.scrollToBottom();
    }
  }

  /**
   * Hide typing indicator
   */
  hideTypingIndicator() {
    console.log('Hiding typing indicator');
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    this.isTyping = false;
  }

  /**
   * Add a system/info message (tool usage, timing)
   */
  addSystemMessage(text) {
    const div = document.createElement('div');
    div.style.cssText = 'font-size:10px;color:#acacac;text-align:center;padding:4px 12px;font-family:monospace;letter-spacing:0.02em;';
    div.textContent = text;
    this.chatBody.appendChild(div);
    this.scrollToBottom();
  }
  
  /**
   * Scroll to the bottom of the chat
   */
  scrollToBottom() {
    this.chatBody.scrollTop = this.chatBody.scrollHeight;
  }
  
  /**
   * Open the chat widget
   */
  openChat() {
    console.log('Opening chat widget');
    this.widget.classList.remove('hidden');
    this.launchButton.style.display = 'none';
    this.isOpen = true;
    
    // Wait for animation to complete then focus input
    setTimeout(() => {
      if (!this.isMinimized) {
        this.chatInput.focus();
      }
    }, 300);
  }
  
  /**
   * Close the chat widget
   */
  closeChat() {
    console.log('Closing chat widget');
    this.widget.classList.add('hidden');
    this.launchButton.style.display = 'flex';
    this.isOpen = false;
    this.isMinimized = false;
    this.widget.classList.remove('minimized');
  }
  
  /**
   * Minimize the chat widget
   */
  minimizeChat() {
    console.log('Minimizing chat widget');
    this.widget.classList.add('minimized');
    this.isMinimized = true;
    this.minimizeButton.querySelector('i').classList.remove('fa-minus');
    this.minimizeButton.querySelector('i').classList.add('fa-expand');
  }
  
  /**
   * Maximize the chat widget
   */
  maximizeChat() {
    console.log('Maximizing chat widget');
    this.widget.classList.remove('minimized');
    this.isMinimized = false;
    this.minimizeButton.querySelector('i').classList.remove('fa-expand');
    this.minimizeButton.querySelector('i').classList.add('fa-minus');
    this.chatInput.focus();
  }
}

/**
 * Initialize chatbot when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, checking if chatbot should be enabled');
  // Check if ENABLE_CX_AGENT is true
  const enableAgent = document.body.getAttribute('data-enable-agent');
  console.log('data-enable-agent attribute:', enableAgent);
  if (enableAgent === 'true') {
    console.log('Agent enabled, initializing chatbot');
    // Add chatbot styles
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/static/chatbot.css';
    document.head.appendChild(styleLink);
    
    // Initialize chatbot
    window.chatbot = new ChatbotWidget();
    console.log('Chatbot initialized on window.chatbot');
  }
});

// Add global debugging function
window.debugChatbot = function() {
  console.log('Chatbot debug info:');
  if (!window.chatbot) {
    console.log('Chatbot not initialized');
    return;
  }
  
  console.log('Chatbot state:', {
    conversationId: window.chatbot.conversationId,
    isOpen: window.chatbot.isOpen,
    isMinimized: window.chatbot.isMinimized,
    isTyping: window.chatbot.isTyping
  });
  
  console.log('DOM Elements:');
  console.log('  chatBody exists:', !!window.chatbot.chatBody);
  console.log('  chatInput exists:', !!window.chatbot.chatInput);
  console.log('  sendButton exists:', !!window.chatbot.sendButton);
  console.log('  widget exists:', !!window.chatbot.widget);
  
  return 'Debug info logged to console';
};

console.log('Debug version of chatbot.js loaded - VERSION 2.0 - FIXED FILE UPLOAD');
console.log('Debug version of chatbot.js loading...');

/**
 * Initialize chatbot when DOM is loaded - FORCED INITIALIZATION
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, forcing chatbot initialization...');
  
  // Important: Force initialization regardless of data-enable-agent attribute
  console.log('Adding chatbot styles forcefully');
  
  // Check if styles are already loaded
  if (!document.querySelector('link[href="/static/chatbot.css"]')) {
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/static/chatbot.css';
    document.head.appendChild(styleLink);
    console.log('Chatbot styles added dynamically');
  } else {
    console.log('Chatbot styles already present');
  }
  
  // Initialize chatbot
  console.log('Initializing chatbot widget forcefully');
  setTimeout(() => {
    // Use a timeout to ensure DOM is fully loaded
    if (!window.chatbot) {
      window.chatbot = new ChatbotWidget();
      console.log('Chatbot initialized manually on window.chatbot');
    } else {
      console.log('Chatbot already initialized');
    }
  }, 1000);
});

console.log('Debug chatbot initialization code added');
