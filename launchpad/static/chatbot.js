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
      "Analyze customer interview transcripts and find the top friction points",
      "Create a competitive landscape analysis for our market segment",
      "Build a 30/60/90 day plan for improving enterprise conversion",
    ],
    [
      "Diagnose root cause of checkout latency from error logs",
      "Review this API schema and suggest v2 migration strategy",
      "Generate a rollback plan for our database migration",
    ],
    [
      "Fetch our Figma design system and prototype the dashboard header",
      "Design an accessible onboarding flow for enterprise users",
      "Audit this page for WCAG 2.1 AA compliance",
    ],
    [
      "Design 3 A/B test experiments for the pricing page",
      "Build a MEDDPICC scorecard for our top pipeline deals",
      "Create SEO content briefs for high-intent keyword gaps",
    ],
    [
      "Take screenshots of every page in our staging checkout flow",
      "Navigate to competitor pricing and extract their plan table",
      "Browse our docs site and identify broken links",
    ],
    [
      "Upload a CSV of support tickets -- cluster by theme and severity",
      "Analyze this product screenshot and suggest UX improvements",
      "Upload our quarterly report PDF -- extract key metrics",
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
      this.addMessage('assistant', 'I\'m the NXT Intelligence Agent -- your multi-model AI assistant powered by Claude Opus, GPT-5, and Gemini Pro.\n\nI can help you with:\n\n-- Research synthesis and customer signal mining\n-- Strategic analysis with KPI-tied recommendations\n-- UX design prototyping from Figma components\n-- Engineering diagnosis and patch planning\n-- Growth experiments and SEO analysis\n-- Revenue intelligence and deal strategy\n-- Computer use (screenshots, browser automation)\n\nUpload documents, images, CSVs, or PDFs for analysis. What would you like to work on?');
      // Show rotating suggested prompts
      this.showSuggestedPrompts();
      
      // Initialize WebSocket is not needed for MCP chatbot - we use direct API calls
    } catch (error) {
      console.error('Error creating conversation:', error);
      this.addErrorMessage('Failed to start conversation. Please try again later.');
    }
  }
  
  // WebSocket-related methods removed - now using MCP API directly
  
  /**
   * Add timeout handling for long-running operations
   */
  addTimeoutMessage() {
    this.addMessage('system', 'This operation is taking longer than usual. Please wait while we process your request...');
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
    
    // Show typing indicator with progressive status updates
    this.showTypingIndicator();
    this._inferenceStart = Date.now();

    // Progressive status updates during inference
    this._statusTimers = [
      setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Analyzing your request...'); }, 3000),
      setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Selecting tools and model...'); }, 7000),
      setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Executing tools...'); }, 15000),
      setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Processing results...'); }, 30000),
      setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Still working -- complex multi-tool operation...'); }, 60000),
      setTimeout(() => { if (this.isTyping) this.updateTypingStatus('Almost there -- assembling final response...'); }, 120000),
    ];

    // Scroll to bottom
    this.scrollToBottom();
    
    try {
      // Prepare form data for the API call
      const formData = new FormData();
      formData.append('conversation_id', this.conversationId);
      formData.append('message', message);
      
      // Add file if one is pending
      if (this.fileUpload) {
        console.log('Adding original file to message:', this.fileUpload.name);
        console.log('File object details:', {
          name: this.fileUpload.name,
          type: this.fileUpload.type,
          size: this.fileUpload.size,
          lastModified: this.fileUpload.lastModified
        });
        
        // Use the original File object directly
        formData.append('file', this.fileUpload);
        
        // Debug: Try to inspect what we're actually sending
        console.log('DEBUG: FormData contents being sent:');
        for (let [key, value] of formData.entries()) {
          if (key === 'file') {
            console.log(`  ${key}:`, {
              name: value.name,
              type: value.type,
              size: value.size,
              constructor: value.constructor.name
            });
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
        
        this.fileUpload = null; // Clear the pending file
      }
      
      // Send to MCP API
      const response = await fetch(`${this.baseUrl}/api/mcp/message`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      // Clear status timers
      if (this._statusTimers) this._statusTimers.forEach(t => clearTimeout(t));

      // Calculate elapsed time
      const elapsed = ((Date.now() - this._inferenceStart) / 1000).toFixed(1);

      // Hide typing indicator and add response
      this.hideTypingIndicator();

      // Show tool usage summary if available
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

    // Re-enable send button
    this.sendButton.disabled = !this.chatInput.value.trim();
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
