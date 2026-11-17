import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store/store';
import { sendRAGRequest } from '../../../services/ragPgvector';
import { addMessage, setLoading, setError, clearChatHistory, ChatMessage } from '../../../store/chatSlice';
import { getPostData } from '../../../services/topicService';
import TopicDetailModal from './TopicDetailModal';
import { Topic } from '../../../types/TopicModeling';

const SyntheticCustomerPrompt = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postTopic, setPostTopic] = useState<Topic | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [localChatHistory, setLocalChatHistory] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('claude');
  const dispatch = useDispatch();
  
  // Get state from Redux
  const subreddit = useSelector((state: RootState) => state.topic.subreddit);
  const topicData = useSelector((state: RootState) => state.topic.topicData);
  const projectId = useSelector((state: RootState) => state.topic.projectId);
  const chatHistory = useSelector((state: RootState) => state.chat.chatHistory);
  const isLoading = useSelector((state: RootState) => state.chat.isLoading);
  const error = useSelector((state: RootState) => state.chat.error);
  
  // Available LLM models
  const availableLLMModels = useMemo(() => {
    // The RAG endpoint answers with Claude Opus 5.5 (backend util/llm_models/claude.py)
    return [
      { id: 'claude', name: 'Claude Opus 5.5' }
    ];
  }, []);
  
  // Clear chat history when the component mounts
  useEffect(() => {
    dispatch(clearChatHistory());
  }, [dispatch, projectId]); // Depend on projectId to reset when project changes
  
  // Update local chat history when Redux chat history changes
  useEffect(() => {
    setLocalChatHistory(chatHistory);
  }, [chatHistory]);
  
  // Function to query the RAG API endpoint
  const queryRAG = async (userPrompt: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      
      const response = await sendRAGRequest({
        prompt: userPrompt,
        subreddit: subreddit,
        topicData: topicData,
        model: selectedModel
      });
      
      return response;
    } catch (error: unknown) {
      console.error('Error querying RAG:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while retrieving information';
      dispatch(setError(errorMessage));
      return null;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!prompt.trim() || isLoading) {
      return;
    }
    
    const userPrompt = prompt.trim();
    
    // Add user message to local chat history
    const userMessage: ChatMessage = {
      role: 'user',
      content: userPrompt
    };
    setLocalChatHistory(prev => [...prev, userMessage]);
    
    // Also add to Redux (we'll use Redux for API communication but not for persistent storage)
    dispatch(addMessage(userMessage));
    
    // Clear input
    setPrompt('');
    
    const aiResponse = await queryRAG(userPrompt);
    
    if (aiResponse) {
      // Add AI response to local chat history
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse
      };
      setLocalChatHistory(prev => [...prev, assistantMessage]);
      
      // Also add to Redux
      dispatch(addMessage(assistantMessage));
    }
  };

  // Function to fetch post data and prepare it for the modal
  const handlePostIdClick = async (postId: string) => {
    if (isLoadingPost) return;
    
    setIsLoadingPost(true);
    setSelectedPostId(postId);
    
    try {
      const posts = await getPostData([postId]);
      
      if (posts && posts.length > 0) {
        const post = posts[0];
        
        // Create a topic object for the modal
        const topic: Topic = {
          id: parseInt(post.id) || 0,
          topic: post.title || `Post ${postId}`,
          count: 1,
          score: post.score || 0,
          sentiment: post.sentiment || 'neutral',
          terms: [],
          engagement: {
            post_count: 1,
            total_comments: post.comments?.length || 0,
            total_score: post.score || 0,
            avg_comments_per_post: post.comments?.length || 0,
            avg_score_per_post: post.score || 0
          },
          summary: {
            summary: post.text || post.title || 'No content available',
            key_points: [post.title || ''],
            sentiment_distribution: {
              positive: post.sentiment === 'positive' ? 1 : 0,
              negative: post.sentiment === 'negative' ? 1 : 0,
              neutral: post.sentiment === 'neutral' ? 1 : 0,
            }
          },
          short_summary: post.title || `Reddit Post ${postId}`,
          sources: [{
            sentiment: post.sentiment || 'neutral',
            sentiment_score: post.sentiment_score || 0,
            title: post.title,
            text: post.text || '',
            comments: post.comments || []
          }],
          post_ids: [postId],
          highlight_terms: [],
          theme_words: [],
          related_terms: []
        };
        
        setPostTopic(topic);
      } else {
        console.error(`No post found with ID: ${postId}`);
        dispatch(setError(`Could not find post with ID: ${postId}`));
      }
    } catch (error: unknown) {
      console.error(`Error fetching post ${postId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setError(`Error loading post ${postId}: ${errorMessage}`));
    } finally {
      setIsLoadingPost(false);
    }
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setSelectedPostId(null);
    setPostTopic(null);
  };

  // Function to convert post IDs in text to clickable links
  const parseMessageContent = (content: string) => {
    // List of known post IDs from the example to ensure they're detected
    const knownPostIds = ['qpmkvr', '1hwyls8', 'r62frt', '1hpw3s6', 's4nbcw', '1hj3jv7'];
    
    // Common English words that might match our pattern but should not be treated as post IDs
    const commonWords = [
      'support', 'report', 'users', 'being', 'forced', 'items', 'times', 'weeks', 'agents',
      'human', 'about', 'would', 'going', 'listen', 'company', 'there', 'service', 'issues',
      'rings', 'their', 'asked', 'noted', 'customer', 'battery', 'lasting', 'smooth', 'quick',
      'having', 'while', 'others', 'around', 'without', 'mention', 'telling', 'actively', 'response',
      'reports', 'closing', 'periods', 'warranty', 'pleasant', 'shipping', 'refund'
    ];
    
    // Convert common words to a Set for faster lookups
    const commonWordsSet = new Set(commonWords.map(word => word.toLowerCase()));
    
    // Define types for our parts
    type TextPart = { type: 'text', content: string };
    type PostIdPart = { type: 'postId', postId: string, display: string, refNumber: number };
    type ContentPart = TextPart | PostIdPart;
    
    // Start with a clean slate - we'll build up our result
    const resultParts: ContentPart[] = [];
    let lastIndex = 0;
    
    // Track unique post IDs and their reference numbers
    const postIdMap = new Map<string, number>();
    let refCounter = 1;
    
    // Helper function to get or assign a reference number for a post ID
    const getRefNumber = (postId: string): number => {
      if (!postIdMap.has(postId)) {
        postIdMap.set(postId, refCounter++);
      }
      return postIdMap.get(postId)!;
    };
    
    // First pass: handle post IDs in square brackets [postid] - new format for references
    const inSquareBracketsRegex = /\[([a-zA-Z0-9]{5,8})\]/g;
    let squareBracketMatch;
    
    while ((squareBracketMatch = inSquareBracketsRegex.exec(content)) !== null) {
      const fullMatch = squareBracketMatch[0]; // [postid]
      const postId = squareBracketMatch[1];   // postid
      
      // Skip this match if it's a common word
      if (commonWordsSet.has(postId.toLowerCase())) {
        continue;
      }
      
      // Add the text before this match
      if (squareBracketMatch.index > lastIndex) {
        resultParts.push({
          type: 'text',
          content: content.substring(lastIndex, squareBracketMatch.index)
        });
      }
      
      // Add the post ID with reference number
      resultParts.push({
        type: 'postId',
        postId: postId,
        display: fullMatch,
        refNumber: getRefNumber(postId)
      });
      
      lastIndex = squareBracketMatch.index + fullMatch.length;
    }
    
    // Second pass: handle post IDs in parentheses (postid)
    if (lastIndex < content.length) {
      const remainingContent = content.substring(lastIndex);
      lastIndex = 0;
      const inParenthesesRegex = /\(([a-zA-Z0-9]{5,8})\)/g;
      let match;
      
      while ((match = inParenthesesRegex.exec(remainingContent)) !== null) {
        const fullMatch = match[0]; // (postid)
        const postId = match[1];   // postid
        
        // Skip this match if it's a common word
        if (commonWordsSet.has(postId.toLowerCase())) {
          continue;
        }
        
        // Add the text before this match
        if (match.index > lastIndex) {
          resultParts.push({
            type: 'text',
            content: remainingContent.substring(lastIndex, match.index)
          });
        }
        
        // Add the post ID with reference number
        resultParts.push({
          type: 'postId',
          postId: postId,
          display: fullMatch,
          refNumber: getRefNumber(postId)
        });
        
        lastIndex = match.index + fullMatch.length;
      }
      
      // Add any remaining text
      if (lastIndex < remainingContent.length) {
        resultParts.push({
          type: 'text',
          content: remainingContent.substring(lastIndex)
        });
      }
    }
    
    // Third pass: check for standalone known post IDs
    const processedParts: ContentPart[] = [];
    
    for (const part of resultParts) {
      if (part.type === 'text') {
        const textContent = part.content;
        let textLastIndex = 0;
        
        // Check for each known post ID in the text
        for (const knownId of knownPostIds) {
          const safeKnownId = knownId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape special regex chars
          const knownIdRegex = new RegExp(`\\b(${safeKnownId})\\b`, 'g');
          let knownMatch;
          
          while ((knownMatch = knownIdRegex.exec(textContent)) !== null) {
            // Skip common words
            if (commonWordsSet.has(knownMatch[1].toLowerCase())) {
              continue;
            }
            
            // Add text before this match
            if (knownMatch.index > textLastIndex) {
              processedParts.push({
                type: 'text',
                content: textContent.substring(textLastIndex, knownMatch.index)
              });
            }
            
            // Add the post ID with reference number
            processedParts.push({
              type: 'postId',
              postId: knownMatch[1],
              display: knownMatch[1],
              refNumber: getRefNumber(knownMatch[1])
            });
            
            textLastIndex = knownMatch.index + knownMatch[0].length;
          }
        }
        
        // Add any remaining text
        if (textLastIndex < textContent.length) {
          processedParts.push({
            type: 'text',
            content: textContent.substring(textLastIndex)
          });
        }
      } else {
        // Pass through post IDs
        processedParts.push(part);
      }
    }
    
    // Now render the processed parts
    if (processedParts.length <= 0 || (processedParts.length === 1 && processedParts[0].type === 'text')) {
      return <div className="whitespace-pre-line">{content}</div>;
    }
    
    // Build the JSX result
    const result = processedParts.map((part, index) => {
      if (part.type === 'text') {
        return <span key={`text-${index}`}>{part.content}</span>;
      } else {
        return (
          <button 
            key={`post-${part.postId}-${index}`}
            onClick={() => handlePostIdClick(part.postId)}
            className="inline-flex items-center justify-center w-6 h-6 bg-dark-background text-white rounded-full text-xs font-medium hover:bg-light-background cursor-pointer mx-0.5"
            title={`Click to view details for post ${part.postId}`}
          >
            {part.refNumber}
          </button>
        );
      }
    });
    
    return <div className="whitespace-pre-line">{result}</div>;
  };

  return (
    <div className="bg-[#fafafa] rounded-lg p-6 border border-[#e5e5e5]">
      {/* Post Detail Modal */}
      {selectedPostId && postTopic && (
        <TopicDetailModal
          topic={postTopic}
          onClose={handleCloseModal}
        />
      )}
      
      <div className="flex items-center mb-4">
        <MessageSquare className="text-blue-400 w-5 h-5 mr-2" />
        <h3 className="text-lg font-medium text-[#141414]">Ask about the Reddit data</h3>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div className="text-sm text-[#525252]">
          Ask the AI any question about the Reddit data for <span className="font-bold text-base">r/{subreddit}</span>. 
          The AI will analyze the retrieved posts to provide insights.
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm text-[#525252]">Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#f5f5f5] text-[#141414] border border-[#e5e5e5] rounded p-1 text-sm"
            disabled={isLoading}
          >
            {availableLLMModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Chat History - using localChatHistory instead of Redux state */}
      {localChatHistory.length > 0 && (
        <div className="mb-4 max-h-96 overflow-y-auto">
          {localChatHistory.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg mb-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white ml-10'
                  : 'bg-[#f5f5f5] text-[#141414] mr-10'
              }`}
            >
              <div className="text-sm">
                {message.role === 'assistant' 
                  ? parseMessageContent(message.content)
                  : <div className="whitespace-pre-line">{message.content}</div>
                }
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about Reddit users' feedback, problems, favorite features..."
            className="flex-1 p-3 bg-white border border-[#e5e5e5] rounded-l-md text-[#141414] placeholder-[#acacac] focus:outline-none focus:ring-2 focus:ring-[#115054]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className={`p-3 rounded-r-md flex items-center justify-center w-12 h-12 ${
              isLoading || !prompt.trim()
                ? 'bg-[#e5e5e5] text-[#525252] cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {/* Empty State */}
      {!localChatHistory.length && !isLoading && !error && (
        <div className="mt-6 text-center py-6 border border-dashed border-[#e5e5e5] rounded-lg">
          <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-[#525252]">
            Ask questions like "What problems are users experiencing?" or<br />
            "What features do users like the most?"
          </p>
        </div>
      )}
    </div>
  );
};

export default SyntheticCustomerPrompt;