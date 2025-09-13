import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import MessageList from './MessageList';
import { sendChatMessage } from '../../api';

const ChatInterface = ({ chatHistory = [], onChatUpdate, journeyData }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || !journeyData) return;
    
    // Update local chat history with user message
    const updatedHistory = [
      ...chatHistory,
      { role: 'user', content: inputMessage }
    ];
    onChatUpdate(updatedHistory);
    
    // Clear input
    setInputMessage('');
    
    // Send message to backend
    setLoading(true);
    try {
      const response = await sendChatMessage(inputMessage);
      
      if (response.success) {
        // Add AI response to chat history
        const finalHistory = [
          ...updatedHistory,
          { role: 'assistant', content: response.message }
        ];
        onChatUpdate(finalHistory);
      } else {
        // Add error message
        const finalHistory = [
          ...updatedHistory,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
        ];
        onChatUpdate(finalHistory);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const finalHistory = [
        ...updatedHistory,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ];
      onChatUpdate(finalHistory);
    } finally {
      setLoading(false);
    }
  };

  // Suggested prompts
  const suggestedPrompts = [
    'What are the key pain points?',
    'Highlight the onboarding phase',
    'Summarize customer emotions',
    'What opportunities should we prioritize?'
  ];

  const handleSuggestedPrompt = (prompt) => {
    setInputMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Chat with AI</h3>
          <p className="text-sm text-gray-500 mt-1">Ask questions about your journey map</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {journeyData ? (
            <>
              <MessageList 
                messages={chatHistory}
                loading={loading}
              />
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="text-5xl mb-4">💬</div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Journey Map Available</h3>
                <p className="text-gray-600 max-w-md">Generate a journey map first to start a conversation about it</p>
              </div>
            </div>
          )}
        </div>
        
        {journeyData && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your journey map..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={loading}
              >
                <ArrowRight size={20} />
              </button>
            </div>
            <div className="mt-3 flex justify-between">
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 whitespace-nowrap"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-500">Powered by Gemma 7B</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;