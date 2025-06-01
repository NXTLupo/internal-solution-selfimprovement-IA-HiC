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
