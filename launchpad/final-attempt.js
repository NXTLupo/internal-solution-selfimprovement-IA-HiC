// Create the debug panel
const panel = document.createElement('div');
panel.style.position = 'fixed';
panel.style.top = '10px';
panel.style.right = '10px';
panel.style.backgroundColor = 'white';
panel.style.border = '2px solid red';
panel.style.padding = '15px';
panel.style.borderRadius = '8px';
panel.style.zIndex = '10000';
panel.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';

// Create the heading
const heading = document.createElement('h3');
heading.style.marginTop = '0';
heading.style.color = 'red';
heading.textContent = 'Emergency Chatbot Debug';
panel.appendChild(heading);

// Create button container
const buttonContainer = document.createElement('div');
buttonContainer.style.marginBottom = '10px';

// Create the init button
const initButton = document.createElement('button');
initButton.style.padding = '8px 12px';
initButton.style.backgroundColor = 'red';
initButton.style.color = 'white';
initButton.style.border = 'none';
initButton.style.borderRadius = '4px';
initButton.style.marginRight = '5px';
initButton.style.cursor = 'pointer';
initButton.textContent = 'Force Init';
buttonContainer.appendChild(initButton);

// Create the show button
const showButton = document.createElement('button');
showButton.style.padding = '8px 12px';
showButton.style.backgroundColor = '#555';
showButton.style.color = 'white';
showButton.style.border = 'none';
showButton.style.borderRadius = '4px';
showButton.style.marginRight = '5px';
showButton.style.cursor = 'pointer';
showButton.textContent = 'Show Chat';
buttonContainer.appendChild(showButton);

panel.appendChild(buttonContainer);

// Create the status div
const status = document.createElement('div');
status.style.marginTop = '10px';
status.style.fontSize = '12px';
status.style.backgroundColor = '#f5f5f5';
status.style.padding = '5px';
status.style.borderRadius = '4px';
status.style.maxHeight = '100px';
status.style.overflowY = 'auto';
status.textContent = 'Status will appear here';
panel.appendChild(status);

// Add the panel to the document
document.body.appendChild(panel);

// Add event listeners
initButton.addEventListener('click', function() {
  try {
    status.textContent = 'Attempting to initialize chatbot...';
    if (typeof ChatbotWidget === 'function') {
      if (!window.chatbot) {
        window.chatbot = new ChatbotWidget();
        status.textContent = 'Chatbot initialized successfully!';
      } else {
        status.textContent = 'Chatbot already exists in window.chatbot';
      }
    } else {
      status.textContent = 'ERROR: ChatbotWidget class not found';
    }
  } catch (e) {
    status.textContent = 'Error: ' + e.message;
    console.error(e);
  }
});

showButton.addEventListener('click', function() {
  try {
    if (!window.chatbot) {
      status.textContent = 'No chatbot initialized. Click Force Init first.';
      return;
    }
    
    window.chatbot.openChat();
    status.textContent = 'Chat interface opened';
  } catch (e) {
    status.textContent = 'Error showing chat: ' + e.message;
    console.error(e);
  }
});