// This script can be pasted into the browser console to enable debug mode
console.log("Loading debug version of chatbot.js...");

// Create a script element for the debug version
const script = document.createElement('script');
script.src = '/static/chatbot.debug.js';
script.onload = function() {
  console.log("Debug version of chatbot.js loaded successfully");
  console.log("Call window.debugChatbot() to see chatbot state");
  
  // Add a system message indicating debug mode is enabled
  if (window.chatbot) {
    window.chatbot.addSystemMessage("Debug mode enabled. Check browser console for logs.");
  }
};
script.onerror = function() {
  console.error("Failed to load debug version of chatbot.js");
};

// Remove the original chatbot script
const originalScript = Array.from(document.scripts).find(s => s.src.includes('chatbot.js'));
if (originalScript) {
  originalScript.parentNode.removeChild(originalScript);
  console.log("Original chatbot.js removed");
}

// Add the debug version
document.head.appendChild(script);

// Add a fixed test message function
window.testChatBot = function(message) {
  if (!window.chatbot) {
    console.error("Chatbot not initialized");
    return;
  }
  
  console.log("Sending test message:", message || "Hello, this is a test message");
  window.chatbot.chatInput.value = message || "Hello, this is a test message";
  window.chatbot.sendMessage();
};
