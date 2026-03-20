import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, MessageCircle, ThumbsUp, ThumbsDown, BarChart2, Calendar, Info, User, ArrowLeft, ArrowRight, Loader } from 'lucide-react';
import { getPostData } from '../../../services/topicService';
import { Topic, SentimentEvidencePoint, Source } from '../../../types/TopicModeling';
import { highlightKeywords } from '../../../components/TextHightLight';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { userService } from '../../../services/user';

// Interface for post data with extended properties from the API
interface Post {
  id: string;
  sentiment: string;
  sentiment_score: number;
  text: string;
  created_utc?: number;
  title?: string;
  body?: string; // Extra property for post body (sometimes used instead of text)
  comments?: Source['comments'];
  permalink?: string; // Extra property for the permalink
}

interface TopicDetailModalProps {
  topic: Topic | null;
  onClose: () => void;
}

const TopicDetailModal: React.FC<TopicDetailModalProps> = ({ topic, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [activeSource, setActiveSource] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const navigate = useNavigate();
  
  // Add ref for source buttons container
  const sourceButtonsContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Add state to track if we've just navigated to a source
  const [justNavigatedTo, setJustNavigatedTo] = useState<number | null>(null);
  
  // Add state for showing a scroll indicator
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  // Get user from Redux store
  const user = useSelector((state: RootState) => state.user.currentUser);
  
  // Get the global topicData from Redux to access the keyword value
  const topicData = useSelector((state: RootState) => state.topic.topicData);

  // Define handleClose before it's used in useEffect, wrapped in useCallback to avoid recreation
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  }, [onClose]);
  
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);
  
  useEffect(() => {
    // Make modal visible with a slight delay for animation
    if (topic) {
      // Don't set document.body.style.overflow to prevent hiding scrollbars
      setTimeout(() => setIsVisible(true), 50);
    }
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      // Don't reset document.body.style.overflow since we never set it
    };
  }, [topic, topicData, handleClose]);

  useEffect(() => {
    setPosts([]);
    setActiveSource(0);
    
    // Pre-load post data when the topic changes if it has post IDs
    if (topic?.post_ids && topic.post_ids.length > 0) {
      const postIds = [...topic.post_ids]; // Create a local copy to avoid the undefined issue
      
      setIsLoadingPosts(true);
      getPostData(postIds)
        .then(postData => {
          setPosts(postData);
        })
        .catch(error => {
          console.error('Error fetching post data:', error);
        })
        .finally(() => {
          setIsLoadingPosts(false);
        });
    }
  }, [topic]);

  const handleTabChange = (tab: string) => {
    // Don't do anything if it's the same tab
    if (tab === activeTab) return;
    
    setActiveTab(tab);
    // No need to load post data here since we're pre-loading it when topic changes
  };
  
  useEffect(() => {
    // If posts are loaded and an active source is set, scroll the button into view
    if (posts.length > 0 && activeTab === 'sources') {
      setTimeout(() => {
        if (sourceButtonsContainerRef.current) {
          const buttons = sourceButtonsContainerRef.current.querySelectorAll('button');
          if (buttons && buttons[activeSource]) {
            buttons[activeSource].scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest',
              inline: 'center'
            });
          }
        }
      }, 100);
    }
  }, [posts, activeSource, activeTab]);
  
  // Define relevantKeywords with useMemo before any conditional returns
  const relevantKeywords = useMemo(() => {
    if (!topic) return [];
    
    const keywords = new Set<string>();
    if (topic.keyword_filter) {
      keywords.add(topic.keyword_filter.toLowerCase());
      if (topic.highlight_terms && Array.isArray(topic.highlight_terms)) {
        topic.highlight_terms.forEach(term => {
          if (typeof term === 'string' && term.length > 2) {
            keywords.add(term.toLowerCase());
          }
        });
      }
    }
    
    // If no keyword filter, use theme words (which are topic-specific terms provided by theme extractor)
    if (!topic.keyword_filter && topic.theme_words && Array.isArray(topic.theme_words)) {
      topic.theme_words.forEach(word => {
        if (typeof word === 'string' && word.length > 3) {
          keywords.add(word.toLowerCase());
        }
      });
    } else if (!topic.highlight_terms) {
      // Fallback to topic name words if no theme_words or highlight_terms provided
      if (topic.topic) {
        topic.topic.toLowerCase().split(/\s+/).forEach(word => {
          if (word.length > 3) keywords.add(word.toLowerCase());
        });
      }
    }
    
    // Add related terms (only when there's no keyword filter)
    if (!topic.keyword_filter && topic.related_terms && Array.isArray(topic.related_terms)) {
      topic.related_terms.forEach(term => {
        if (typeof term === 'string' && term.length > 3) {
          keywords.add(term.toLowerCase());
        }
      });
    }
    
    // Add key point words if available (only when there's no keyword filter)
    if (!topic.keyword_filter && topic.summary && typeof topic.summary === 'object' && topic.summary.key_points && Array.isArray(topic.summary.key_points)) {
      topic.summary.key_points.forEach(point => {
        if (typeof point === 'string') {
          point.toLowerCase().split(/\s+/).forEach(word => {
            if (word.length > 3) keywords.add(word.toLowerCase());
          });
        }
      });
    }
    
    return Array.from(keywords)
      .sort((a, b) => b.length - a.length);
  }, [topic]);
  
  // Now do the early return after all hooks have been called
  if (!topic) return null;
  
  // Function to update the highlightText function to use the shared utility
  const highlightText = (text: string) => {
    if (!text) return '';
    
    // Get the sentiment for the current post
    const postSentiment = topic.post_sentiments && posts[activeSource] && posts[activeSource].id
      ? topic.post_sentiments[posts[activeSource].id]?.sentiment_category || 'neutral'
      : posts[activeSource]?.sentiment || 'neutral';
    
    // Use the post-level sentiment for highlighting
    return highlightKeywords(
      text,
      Array.from(relevantKeywords),
      postSentiment, // Use post-level sentiment instead of topic sentiment
      [] // No common word filtering in frontend - this is handled by the backend
    );
  };
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500';
      case 'negative': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };
  
  const getSourceSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'border-green-500 bg-green-50';
      case 'negative': return 'border-red-500 bg-red-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };
  
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
    
  // Helper function to get a display name for a post reference
  const getPostDisplayName = (postId: string) => {
    // If posts are loaded, try to find the index
    if (posts.length > 0) {
      const postIndex = posts.findIndex(post => post.id === postId);
      if (postIndex !== -1) {
        return `Post ${postIndex + 1}`;
      }
    }
    
    // If posts are not loaded, or post not found, see if we can determine its position in post_ids
    if (topic?.post_ids) {
      const idIndex = topic.post_ids.indexOf(postId);
      if (idIndex !== -1) {
        return `Post ${idIndex + 1}`;
      }
    }
    
    // Fallback: use shortened ID as display
    return `Post ${postId.substring(0, 4)}...`;
  };

  // Function to navigate to a post referenced in sentiment evidence
  const navigateToPostByRef = (postRef: string) => {
    // Show scroll indicator
    setShowScrollIndicator(true);
    
    // First ensure posts are loaded
    if (posts.length === 0 && topic?.post_ids && topic.post_ids.length > 0) {
      setIsLoadingPosts(true);
      getPostData(topic.post_ids)
        .then(postData => {
          setPosts(postData);
          // Find and navigate to the post after loading
          findAndNavigateToPost(postData, postRef);
        })
        .catch(error => {
          console.error('Error fetching post data:', error);
          // Hide scroll indicator on error
          setShowScrollIndicator(false);
        })
        .finally(() => {
          setIsLoadingPosts(false);
          // Don't hide scroll indicator here - we'll do it after navigation completes
        });
    } else {
      // Posts already loaded, just find and navigate
      findAndNavigateToPost(posts, postRef);
    }
  };
  
  // Helper function to find post and navigate to it
  const findAndNavigateToPost = (postData: Post[], postRef: string) => {
    console.log('Looking for post with ID:', postRef);
    console.log('Available post IDs:', postData.map(p => p.id));
    
    // Find the index of the post with matching ID
    const postIndex = postData.findIndex(post => {
      // Try different ways to match the post reference
      const exactMatch = post.id === postRef;
      const trimmedMatch = typeof post.id === 'string' && typeof postRef === 'string' && 
                          post.id.trim() === postRef.trim();
      
      if (exactMatch || trimmedMatch) {
        console.log('Found matching post at index:', postData.indexOf(post));
        return true;
      }
      return false;
    });
    
    if (postIndex !== -1) {
      // Switch to sources tab
      setActiveTab('sources');
      // Set the active source to the matching post
      setActiveSource(postIndex);
      // Set the just navigated flag to highlight the button
      setJustNavigatedTo(postIndex);
      
      // Clear the highlight effect after a delay
      setTimeout(() => {
        setJustNavigatedTo(null);
      }, 2000);
      
      console.log('Navigated to post at index:', postIndex);
      
      // Schedule scrolling the button into view after state updates and rendering
      setTimeout(() => {
        // Find the active button within the container
        if (sourceButtonsContainerRef.current) {
          const buttons = sourceButtonsContainerRef.current.querySelectorAll('button');
          if (buttons && buttons[postIndex]) {
            buttons[postIndex].scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest',
              inline: 'center'
            });
            console.log('Scrolled to source button:', postIndex);
            
            // Hide scroll indicator after scrolling is complete
            setTimeout(() => {
              setShowScrollIndicator(false);
            }, 500);
          } else {
            setShowScrollIndicator(false);
          }
        } else {
          setShowScrollIndicator(false);
        }
      }, 100); // Short delay to ensure rendering is complete
    } else {
      console.warn(`Post with reference ${postRef} not found in loaded posts`);
      // Still switch to sources tab even if specific post not found
      setActiveTab('sources');
      // Hide scroll indicator since we couldn't find the post
      setShowScrollIndicator(false);
    }
  };
  
  // Function to create a new sentiment analysis project
  const createSentimentProject = async () => {
    if (!topic || !topic.post_ids || topic.post_ids.length === 0) {
      console.error("No topic or post IDs available");
      return;
    }
    
    if (!user || !user.id) {
      console.error("User not found");
      return;
    }
    
    setIsCreatingProject(true);
    
    try {
      // Use the userService to create a new project
      const data = await userService.createProject(user.id, 'sentiment', {
        topic_name: topic.topic || "Unnamed Topic"
      });
      
      // Navigate to sentiment analysis page with the new project ID
      navigate(`/sentiment-analysis/${data.id}`);
    } catch (error) {
      console.error("Error creating sentiment analysis project:", error);
      // Handle error appropriately
    } finally {
      setIsCreatingProject(false);
    }
  };
  
  const modalContent = (
    <div 
      className={`fixed inset-0 z-[9999] overflow-auto duration-200 text-[#141414]`}
      onClick={handleBackdropClick}
      style={{ 
        display: isVisible ? 'block' : 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
      }}
    >
      {/* Scroll indicator overlay */}
      {showScrollIndicator && (
        <div className="fixed inset-0 flex items-center justify-center z-[10000] bg-black/40 pointer-events-none">
          <div className="bg-blue-500/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center animate-pulse">
            <ArrowRight className="h-5 w-5 mr-2 animate-bounce" />
            <span>Navigating to post...</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="rounded-lg bg-white w-full max-w-6xl shadow-2xl border border-[#e5e5e5] flex flex-col transition-transform duration-200"
          onClick={e => e.stopPropagation()}
          style={{ maxHeight: '90vh' }}
        >

          <div className="flex-none flex justify-between items-center p-6 border-b border-[#e5e5e5]">
            <div>
              <h3 className="text-2xl font-bold text-[#141414] tracking-tight">
                {topic.short_summary || topic.topic || "Topic Details"}
              </h3>
              <p className="text-sm text-[#525252] mt-1">
                <span className="font-medium">{topic.count}</span> mentions -
                <span className={`${
                  topic.sentiment === 'positive' ? 'text-green-600' :
                  topic.sentiment === 'negative' ? 'text-red-600' :
                  'text-[#115054]'
                } ml-1`}>{topic.sentiment} sentiment</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={createSentimentProject}
                disabled={isCreatingProject}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md ${
                  isCreatingProject
                    ? 'bg-[#f5f5f5] text-[#acacac] cursor-not-allowed'
                    : 'bg-[#caca20] text-[#115054] hover:brightness-110 hover:shadow-lg'
                }`}
              >
                {isCreatingProject ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart2 className="h-4 w-4" />
                )}
                <span>Analyze {topicData?.keyword ? `"${topicData.keyword}"` : 'Topic'} In Detail</span>
              </button>
              <button
                onClick={handleClose}
                className="text-[#525252] hover:text-[#141414] hover:bg-[#f5f5f5] p-2 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Tabs - Fixed below header */}
          <div className="flex-none border-b border-[#e5e5e5]">
            <div className="flex px-2">
              <button
                className={`px-6 py-4 flex items-center text-sm font-medium transition-colors ${
                  activeTab === 'summary'
                    ? 'text-[#115054] border-b-2 border-blue-400 font-semibold'
                    : 'text-[#525252] hover:text-[#141414] hover:bg-[#f5f5f5]'
                }`}
                onClick={() => handleTabChange('summary')}
              >
                <Info className="h-4 w-4 mr-2" />
                Summary
              </button>
              <button
                className={`px-6 py-4 flex items-center text-sm font-medium transition-colors ${
                  activeTab === 'sources'
                    ? 'text-[#115054] border-b-2 border-blue-400 font-semibold'
                    : 'text-[#525252] hover:text-[#141414] hover:bg-[#f5f5f5]'
                }`}
                onClick={() => handleTabChange('sources')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Sources & Comments
              </button>
            </div>
          </div>
          
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
            {activeTab === 'summary' && (
              <div className="p-6 space-y-8">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#525252] mb-3">Topic Summary</h4>
                  <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-6">
                    <p className="text-[#141414] text-lg leading-relaxed">
                      {typeof topic.summary === 'object' && topic.summary.summary 
                        ? topic.summary.summary 
                        : typeof topic.summary === 'string' 
                          ? topic.summary 
                          : "No summary available for this topic."}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3 text-[#525252]">Sentiment Distribution</h4>
                  {topic.post_sentiments ? (
                    (() => {
                      // Calculate sentiment distribution from actual post sentiments
                      const distribution = {
                        positive: 0,
                        negative: 0,
                        neutral: 0
                      };
                      
                      // Count posts by sentiment category
                      Object.values(topic.post_sentiments).forEach(post => {
                        const sentiment = post.sentiment_category;
                        if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
                          distribution[sentiment]++;
                        }
                      });
                      
                      const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
                      
                      if (total === 0) {
                        return <p className="text-[#525252] text-sm">No sentiment data available</p>;
                      }
                      
                      // Calculate percentages
                      const positivePercentage = (distribution.positive / total) * 100;
                      const neutralPercentage = (distribution.neutral / total) * 100;
                      const negativePercentage = (distribution.negative / total) * 100;
                      
                      return (
                        <div className="space-y-1">
                          {/* Gradient bar */}
                          <div className="h-2 w-full rounded-full overflow-hidden flex">
                            <div 
                              style={{ width: `${positivePercentage}%` }} 
                              className="bg-green-400 h-full"
                            />
                            <div 
                              style={{ width: `${neutralPercentage}%` }} 
                              className="bg-blue-400 h-full"
                            />
                            <div 
                              style={{ width: `${negativePercentage}%` }} 
                              className="bg-red-400 h-full"
                            />
                          </div>
                          
                          {/* Labels */}
                          <div className="flex justify-between text-xs text-[#525252]">
                            <div className="flex items-center">
                              <div className="bg-green-500 w-2 h-2 rounded-full mr-1" />
                              <span>Positive: {distribution.positive} ({positivePercentage.toFixed(0)}%)</span>
                            </div>
                            <div className="flex items-center">
                              <div className="bg-blue-500 w-2 h-2 rounded-full mr-1" />
                              <span>Neutral: {distribution.neutral} ({neutralPercentage.toFixed(0)}%)</span>
                            </div>
                            <div className="flex items-center">
                              <div className="bg-red-500 w-2 h-2 rounded-full mr-1" />
                              <span>Negative: {distribution.negative} ({negativePercentage.toFixed(0)}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-[#525252] text-sm">No sentiment data available</p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium mb-3 text-[#525252] ">Keywords & Related Terms</h4>
                  <div className="space-y-2">
                    {/* Related Terms */}
                    {topic.related_terms && topic.related_terms.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {topic.related_terms.map((term, index) => (
                            <span 
                              key={index}
                              className="bg-[#e5e5e5] text-[#141414] px-2 py-1 rounded-lg text-sm"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3 text-[#525252]">Key Sentiment Points</h4>
                  
                  {/* Display sentiment evidence */}
                  {topic.sentiment_evidence ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Positive Evidence */}
                      <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-4">
                        <h5 className="flex items-center justify-between text-green-600 font-medium mb-3">
                          <span className="flex items-center">
                            <ThumbsUp className="h-4 w-4 mr-2" />
                            Positive Insights
                          </span>
                          <span className="text-xs text-[#525252] italic">Click on post IDs to view sources</span>
                        </h5>
                        
                        {topic.sentiment_evidence.positive && topic.sentiment_evidence.positive.length > 0 ? (
                          <ul className="space-y-4">
                            {topic.sentiment_evidence.positive.map((evidence: SentimentEvidencePoint, idx: number) => (
                              <li 
                                key={idx} 
                                className="pb-3 border-b border-[#e5e5e5] last:border-b-0 last:pb-0 hover:bg-[#f5f5f5] rounded-lg transition-colors"
                              >
                                <div 
                                  className="p-2"
                                >
                                  <div className="flex items-start mb-2">
                                    <span className="text-[#141414] flex-1">{evidence.point}</span>
                                  </div>
                                  {evidence.post_refs && evidence.post_refs.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {evidence.post_refs.map((ref: string, refIdx: number) => {
                                        // Get display text for this post reference
                                        const displayText = getPostDisplayName(ref);
                                        
                                        return (
                                          <span 
                                            key={refIdx} 
                                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded cursor-pointer hover:bg-green-200 hover:text-green-800 hover:shadow-md transition-colors font-medium flex items-center"
                                            onClick={(e) => {
                                              e.stopPropagation(); // Prevent the parent's onClick from firing
                                              navigateToPostByRef(ref);
                                            }}
                                            title={`View ${displayText}`}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            {displayText}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[#525252] text-sm">No positive evidence available</p>
                        )}
                      </div>
                      
                      {/* Negative Evidence */}
                      <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-4">
                        <h5 className="flex items-center justify-between text-red-600 font-medium mb-3">
                          <span className="flex items-center">
                            <ThumbsDown className="h-4 w-4 mr-2" />
                            Negative Insights
                          </span>
                          <span className="text-xs text-[#525252] italic">Click on post IDs to view sources</span>
                        </h5>
                        
                        {topic.sentiment_evidence.negative && topic.sentiment_evidence.negative.length > 0 ? (
                          <ul className="space-y-4">
                            {topic.sentiment_evidence.negative.map((evidence: SentimentEvidencePoint, idx: number) => (
                              <li 
                                key={idx} 
                                className="pb-3 border-b border-[#e5e5e5] last:border-b-0 last:pb-0 hover:bg-[#f5f5f5] rounded-lg transition-colors"
                              >
                                <div 
                                  className="p-2"
                                >
                                  <div className="flex items-start mb-2">
                                    <span className="text-[#141414] flex-1">{evidence.point}</span>
                                  </div>
                                  {evidence.post_refs && evidence.post_refs.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {evidence.post_refs.map((ref: string, refIdx: number) => {
                                        // Get display text for this post reference
                                        const displayText = getPostDisplayName(ref);
                                        
                                        return (
                                          <span 
                                            key={refIdx} 
                                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded cursor-pointer hover:bg-red-200 hover:text-red-800 hover:shadow-md transition-colors font-medium flex items-center"
                                            onClick={(e) => {
                                              e.stopPropagation(); // Prevent the parent's onClick from firing
                                              navigateToPostByRef(ref);
                                            }}
                                            title={`View ${displayText}`}
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            {displayText}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[#525252] text-sm">No negative evidence available</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#fafafa] p-4 rounded-lg text-center text-[#525252]">
                      No sentiment evidence available for this topic
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'sources' && (
              <div className="p-6">
                {isLoadingPosts ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-[#525252]">Loading post data...</p>
                  </div>
                ) : posts.length > 0 ? (
                  <>
                    <div 
                      className="flex overflow-x-auto mb-4 pb-2 gap-2"
                      ref={sourceButtonsContainerRef}
                    >
                      {posts.map((_, index) => (
                        <button
                          key={index}
                          className={`${
                            activeSource === index
                              ? `bg-[#115054] text-white`
                              : `bg-[#fafafa] text-[#525252] hover:bg-[#f5f5f5] hover:text-[#141414]`
                          } px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                            justNavigatedTo === index ? 'ring-2 ring-blue-500 ring-opacity-75 animate-pulse' : ''
                          }`}
                          onClick={() => setActiveSource(index)}
                        >
                          Source {index + 1}
                        </button>
                      ))}
                    </div>
                    
                    {posts[activeSource] && (
                      <div className="space-y-4">
                        
                        <div className="flex justify-between text-sm text-[#525252]">
                          <div className="flex items-center">
                            <div 
                              className={`${
                                topic.post_sentiments && topic.post_sentiments[posts[activeSource].id] 
                                  ? getSentimentColor(topic.post_sentiments[posts[activeSource].id].sentiment_category)
                                  : getSentimentColor(posts[activeSource].sentiment || 'neutral')
                              } w-3 h-3 rounded-full mr-2`}
                            />
                            <span className="text-[#525252]">
                              {topic.post_sentiments && topic.post_sentiments[posts[activeSource].id]
                                ? (topic.post_sentiments[posts[activeSource].id].sentiment_category.charAt(0).toUpperCase() + 
                                   topic.post_sentiments[posts[activeSource].id].sentiment_category.slice(1))
                                : (posts[activeSource].sentiment || 'neutral').charAt(0).toUpperCase() + 
                                  (posts[activeSource].sentiment || 'neutral').slice(1)
                              } 
                              {topic.post_sentiments && topic.post_sentiments[posts[activeSource].id]
                                ? `(${topic.post_sentiments[posts[activeSource].id].sentiment_score.toFixed(2)})`
                                : posts[activeSource].sentiment_score && `(${posts[activeSource].sentiment_score.toFixed(2)})`
                              }
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                            {formatDate(posts[activeSource].created_utc || 0)}
                          </div>
                        </div>
                        
                        <div 
                          className={`${
                            topic.post_sentiments && topic.post_sentiments[posts[activeSource].id]
                              ? getSourceSentimentColor(topic.post_sentiments[posts[activeSource].id].sentiment_category)
                              : getSourceSentimentColor(posts[activeSource].sentiment || 'neutral')
                          } p-4 rounded-lg border overflow-auto relative`}
                          style={{ maxHeight: '40vh' }}
                        >
                          {posts[activeSource].permalink && (
                            <a
                              href={`https://reddit.com${posts[activeSource].permalink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 flex items-center px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-full text-xs font-medium transition-colors shadow-md z-10 animate-pulse hover:animate-none"
                              title="View original post on Reddit"
                            >
                              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <g fill="currentColor">
                                  <circle cx="9.67" cy="13" r="1.001"/>
                                  <circle cx="14.33" cy="13" r="1.001"/>
                                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10z"/>
                                </g>
                              </svg>
                              Original Post
                            </a>
                          )}
                          
                          {posts[activeSource].title && (
                            <div className="flex justify-between items-start mb-2">
                              <h4 
                                className="text-lg font-medium text-[#141414]"
                                dangerouslySetInnerHTML={{
                                  __html: highlightText(posts[activeSource].title)
                                }}
                              />
                            </div>
                          )}
                          <p 
                            className="text-[#141414] whitespace-pre-line"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(posts[activeSource].text || posts[activeSource].body || '')
                            }}
                          />
                        </div>
                        
                        {/* Comments for the active source */}
                        {posts[activeSource].comments && posts[activeSource].comments.length > 0 ? (
                          <div className="bg-[#fafafa] p-4 rounded-lg mt-4">
                            <h4 className="flex items-center text-sm uppercase tracking-wider text-[#525252] mb-3">
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Comments ({posts[activeSource].comments.length})
                            </h4>
                            <div className="space-y-3 overflow-auto pr-2" 
                                 style={{ maxHeight: '30vh' }}>
                              {posts[activeSource].comments.map((comment: NonNullable<Source['comments']>[number], commentIndex: number) => (
                                <div 
                                  key={commentIndex} 
                                  className="p-3 bg-[#f5f5f5]/50 rounded-lg border border-gray-600"
                                >
                                  <div className="flex justify-between mb-2 text-sm">
                                    <div className="flex items-center">
                                      <User className="h-4 w-4 mr-1 text-gray-500" />
                                      <span className="text-[#525252]">
                                        {comment.author || '[deleted]'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <span className="flex items-center text-[#525252]">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {formatDate(comment.created_utc || 0)}
                                      </span>
                                      
                                      <span className={`flex items-center ${
                                        comment.score > 0 
                                          ? 'text-green-600' 
                                          : comment.score < 0 
                                            ? 'text-red-600' 
                                            : 'text-[#525252]'
                                      }`}>
                                        {comment.score > 0 ? (
                                          <ThumbsUp className="h-3 w-3 mr-1" />
                                        ) : comment.score < 0 ? (
                                          <ThumbsDown className="h-3 w-3 mr-1" />
                                        ) : null}
                                        {comment.score}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <p 
                                    className="text-[#141414] text-sm"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightText(comment.body)
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#fafafa] p-4 rounded-lg text-center text-[#525252]">
                            No comments available for this source
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-[#fafafa] p-8 rounded-lg text-center">
                    <p className="text-[#525252]">No source content available for this topic.</p>
                    {topic.post_ids && topic.post_ids.length > 0 && (
                      <button
                        onClick={() => {
                          // Recreate the post loading logic here
                          if (!topic.post_ids) return;
                          
                          const postIds = [...topic.post_ids]; // Create a local copy
                          
                          setIsLoadingPosts(true);
                          getPostData(postIds)
                            .then(postData => {
                              setPosts(postData);
                            })
                            .catch(error => {
                              console.error('Error fetching post data:', error);
                            })
                            .finally(() => {
                              setIsLoadingPosts(false);
                            });
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
                      >
                        Load Post Data
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer with navigation controls - Fixed position */}
          <div className="flex-none border-t border-[#e5e5e5] p-4">
            {activeTab === 'sources' && posts.length > 0 && (
              <div className="flex justify-between items-center">
                <button
                  className={`flex items-center px-3 py-2 rounded-lg text-sm ${
                    activeSource > 0 
                      ? 'bg-[#115054] text-white hover:bg-[#e5e5e5] cursor-pointer' 
                      : 'bg-[#fafafa] text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => activeSource > 0 && setActiveSource(activeSource - 1)}
                  disabled={activeSource === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                
                <span className="text-sm text-[#525252]">
                  {activeSource + 1} of {posts.length}
                </span>
                
                <button
                  className={`flex items-center px-3 py-2 rounded-lg text-sm ${
                    activeSource < posts.length - 1
                      ? 'bg-[#115054] text-white hover:bg-[#e5e5e5] cursor-pointer' 
                      : 'bg-[#fafafa] text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => 
                    activeSource < posts.length - 1 && 
                    setActiveSource(activeSource + 1)
                  }
                  disabled={activeSource === posts.length - 1}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            )}
            
            <div className={`flex ${activeTab === 'sources' && posts.length > 0 ? 'justify-end mt-4' : 'justify-end'}`}>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-[#115054] text-[#141414] hover:text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};


export default TopicDetailModal;