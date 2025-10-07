// Direct ChatbotWidget class definition and injection
// This creates a basic version of the ChatbotWidget class if it doesn't exist

console.log('Emergency chatbot fix loaded');

// Create a backup chatbot class if needed
if (typeof ChatbotWidget !== 'function') {
  console.log('ChatbotWidget class not found, creating emergency replacement');
  
  class EmergencyChatbotWidget {
    constructor() {
      console.log('Emergency ChatbotWidget initialized');
      this.conversationId = 'emergency-' + Math.random().toString(36).substring(2, 15);
      this.isOpen = false;
      this.createWidgetDOM();
    }
    
    createWidgetDOM() {
      // Create a simple chat interface
      const widget = document.createElement('div');
      widget.className = 'emergency-chatbot';
      widget.style.position = 'fixed';
      widget.style.bottom = '20px';
      widget.style.right = '20px';
      widget.style.width = '350px';
      widget.style.height = '500px';
      widget.style.backgroundColor = 'white';
      widget.style.border = '1px solid #ccc';
      widget.style.borderRadius = '8px';
      widget.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
      widget.style.display = 'none';
      widget.style.flexDirection = 'column';
      widget.style.zIndex = '9999';
      
      // Create header
      const header = document.createElement('div');
      header.style.padding = '10px';
      header.style.backgroundColor = '#01C4C8';
      header.style.color = 'white';
      header.style.borderTopLeftRadius = '8px';
      header.style.borderTopRightRadius = '8px';
      header.style.fontWeight = 'bold';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      
      const title = document.createElement('div');
      title.textContent = 'NXT Humans Assistant (Emergency Mode)';
      header.appendChild(title);
      
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'X';
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.color = 'white';
      closeBtn.style.cursor = 'pointer';
      closeBtn.addEventListener('click', () => this.closeChat());
      header.appendChild(closeBtn);
      
      widget.appendChild(header);
      
      // Create body
      const body = document.createElement('div');
      body.style.flex = '1';
      body.style.padding = '10px';
      body.style.overflowY = 'auto';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.innerHTML = `
        <div style="text-align: center; margin-top: 20px;">
          <p>Emergency Chatbot Mode</p>
          <p>The regular chatbot could not be loaded.</p>
          <p>This is a placeholder interface.</p>
          <p>Please check the console for errors.</p>
        </div>
      `;
      widget.appendChild(body);
      
      // Create input area
      const footer = document.createElement('div');
      footer.style.padding = '10px';
      footer.style.borderTop = '1px solid #eee';
      footer.style.display = 'flex';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type a message...';
      input.style.flex = '1';
      input.style.padding = '8px';
      input.style.border = '1px solid #ddd';
      input.style.borderRadius = '4px';
      footer.appendChild(input);
      
      const sendBtn = document.createElement('button');
      sendBtn.textContent = 'Send';
      sendBtn.style.marginLeft = '10px';
      sendBtn.style.padding = '8px 12px';
      sendBtn.style.backgroundColor = '#01C4C8';
      sendBtn.style.color = 'white';
      sendBtn.style.border = 'none';
      sendBtn.style.borderRadius = '4px';
      sendBtn.style.cursor = 'pointer';
      footer.appendChild(sendBtn);
      
      widget.appendChild(footer);
      
      // Add to document
      document.body.appendChild(widget);
      this.widget = widget;
      
      // Create launch button
      const launchButton = document.createElement('button');
      launchButton.textContent = '💬';
      launchButton.style.position = 'fixed';
      launchButton.style.bottom = '20px';
      launchButton.style.right = '20px';
      launchButton.style.width = '50px';
      launchButton.style.height = '50px';
      launchButton.style.borderRadius = '50%';
      launchButton.style.backgroundColor = '#01C4C8';
      launchButton.style.color = 'white';
      launchButton.style.border = 'none';
      launchButton.style.fontSize = '24px';
      launchButton.style.cursor = 'pointer';
      launchButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      launchButton.style.zIndex = '9998';
      
      launchButton.addEventListener('click', () => this.openChat());
      document.body.appendChild(launchButton);
      this.launchButton = launchButton;
    }
    
    openChat() {
      console.log('Opening emergency chat widget');
      this.widget.style.display = 'flex';
      this.launchButton.style.display = 'none';
      this.isOpen = true;
    }
    
    closeChat() {
      console.log('Closing emergency chat widget');
      this.widget.style.display = 'none';
      this.launchButton.style.display = 'block';
      this.isOpen = false;
    }
    
    initWebSocket() {
      console.log('Emergency chatbot cannot initialize WebSockets');
      return null;
    }
  }
  
  // Make our emergency class available globally
  window.ChatbotWidget = EmergencyChatbotWidget;
}

// Create a debug panel for checking the ChatbotWidget class
const debugDiv = document.createElement('div');
debugDiv.style.position = 'fixed';
debugDiv.style.top = '10px';
debugDiv.style.left = '10px';
debugDiv.style.backgroundColor = '#ff5a5a';
debugDiv.style.color = 'white';
debugDiv.style.padding = '10px';
debugDiv.style.borderRadius = '5px';
debugDiv.style.zIndex = '10001';
debugDiv.style.maxWidth = '500px';
debugDiv.style.wordBreak = 'break-word';

// Check status of ChatbotWidget
const chatbotInfo = {
  exists: typeof ChatbotWidget === 'function',
  isCustomImpl: typeof ChatbotWidget === 'function' && ChatbotWidget.name === 'EmergencyChatbotWidget',
  source: typeof ChatbotWidget === 'function' ? (ChatbotWidget.toString().substring(0, 100) + '...') : 'Not available'
};

debugDiv.textContent = JSON.stringify(chatbotInfo, null, 2);

// Add button to manually initialize
const initButton = document.createElement('button');
initButton.textContent = 'Initialize and Show Chatbot';
initButton.style.display = 'block';
initButton.style.marginTop = '10px';
initButton.style.padding = '5px 10px';
initButton.style.backgroundColor = '#01C4C8';
initButton.style.color = 'white';
initButton.style.border = 'none';
initButton.style.borderRadius = '5px';
initButton.style.cursor = 'pointer';

initButton.addEventListener('click', function() {
  try {
    if (!window.chatbot) {
      window.chatbot = new ChatbotWidget();
      debugDiv.textContent += '\nChatbot initialized!';
    }
    
    if (typeof window.chatbot.openChat === 'function') {
      window.chatbot.openChat();
      debugDiv.textContent += '\nChat opened!';
    } else {
      debugDiv.textContent += '\nError: No openChat method!';
    }
  } catch (e) {
    debugDiv.textContent += '\nError: ' + e.message;
  }
});

debugDiv.appendChild(initButton);
document.body.appendChild(debugDiv);