// Direct WebSocket Fix for NXT HUMANS AI CX WORKBENCH Chatbot
(function() {
    console.log("🔧 Applying direct WebSocket fix for chatbot...");
    
    // Function to inject the WebSocket fix into the chatbot iframe
    function injectFixIntoChatbotIframe() {
        const chatbotFrame = document.querySelector('.chatbot-frame');
        if (!chatbotFrame || !chatbotFrame.contentWindow) {
            console.log("❌ Chatbot iframe not found or not accessible");
            return false;
        }
        
        try {
            // Access the iframe's window and document
            const iframeWindow = chatbotFrame.contentWindow;
            
            // Store the original WebSocket constructor in the iframe
            const OriginalWebSocket = iframeWindow.WebSocket;
            
            // Create our own fixed WebSocket implementation
            function FixedWebSocket(url, protocols) {
                console.log(`🔄 Original WebSocket request to: ${url}`);
                
                // Check if this is a proxy connection to the agent
                if (url.includes('/ws-proxy/')) {
                    // Extract the conversation ID
                    const conversationId = url.split('/ws-proxy/')[1];
                    
                    // Create direct connection to the agent service
                    const directUrl = `ws://localhost:8500/ws/${conversationId}`;
                    console.log(`✅ Redirecting WebSocket to: ${directUrl}`);
                    
                    // Create the WebSocket with the direct URL
                    return new OriginalWebSocket(directUrl, protocols);
                } else {
                    // For any other WebSocket connection, use the original URL
                    return new OriginalWebSocket(url, protocols);
                }
            }
            
            // Copy all properties from the original WebSocket to our fixed version
            FixedWebSocket.prototype = OriginalWebSocket.prototype;
            FixedWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
            FixedWebSocket.OPEN = OriginalWebSocket.OPEN;
            FixedWebSocket.CLOSING = OriginalWebSocket.CLOSING;
            FixedWebSocket.CLOSED = OriginalWebSocket.CLOSED;
            
            // Replace the iframe's WebSocket constructor with our fixed version
            iframeWindow.WebSocket = FixedWebSocket;
            
            console.log("✅ WebSocket fix successfully injected into chatbot iframe");
            return true;
        } catch (error) {
            console.error("❌ Error injecting WebSocket fix:", error);
            return false;
        }
    }
    
    // Function to start the direct WebSocket server
    function startDirectServer() {
        console.log("🔄 Starting direct WebSocket server...");
        
        // Create a script element to load the server
        const script = document.createElement('script');
        script.src = 'http://localhost:8500/client.js';
        script.onerror = function() {
            console.error("❌ Failed to load direct server script. Make sure the server is running.");
            alert("Failed to connect to the agent server. Please start the server using ./launch-agent-fix.sh");
        };
        script.onload = function() {
            console.log("✅ Direct WebSocket server script loaded");
        };
        
        // Add the script to the document
        document.head.appendChild(script);
    }
    
    // Function to check if chatbot is loaded and apply fix
    function checkAndApplyFix() {
        const chatbotFrame = document.querySelector('.chatbot-frame');
        if (chatbotFrame && chatbotFrame.contentWindow) {
            // If the chatbot iframe is ready, apply the fix
            if (injectFixIntoChatbotIframe()) {
                console.log("🔧 Fix applied to chatbot iframe");
                return true;
            }
        }
        
        // If not ready yet, try again in 500ms
        console.log("⏳ Chatbot iframe not ready, waiting...");
        setTimeout(checkAndApplyFix, 500);
        return false;
    }
    
    // Global function to restart the chatbot and apply fix
    window.fixChatbotConnection = function() {
        console.log("🔄 Manually fixing chatbot connection...");
        
        // First try to directly inject into existing iframe
        if (injectFixIntoChatbotIframe()) {
            console.log("✅ Fix applied to existing chatbot iframe");
            return "Fix applied! Try sending a message now.";
        }
        
        // If injection failed, try reloading the iframe
        const chatbotFrame = document.querySelector('.chatbot-frame');
        if (chatbotFrame) {
            // Force reload the iframe to apply our fix
            chatbotFrame.src = chatbotFrame.src;
            console.log("🔄 Reloaded chatbot iframe, will apply fix when loaded");
            
            // Set up a check for when the iframe reloads
            setTimeout(checkAndApplyFix, 1000);
            
            return "Chatbot is reloading. Please wait a moment for it to reconnect.";
        }
        
        return "Chatbot frame not found. Is it loaded yet?";
    };
    
    // Start everything
    startDirectServer();
    checkAndApplyFix();
    
    console.log("🔧 WebSocket fix initialization complete");
})();