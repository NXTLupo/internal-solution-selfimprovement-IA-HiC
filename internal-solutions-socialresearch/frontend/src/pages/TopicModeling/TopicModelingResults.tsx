import { useState, useEffect, useMemo } from 'react';
import { AnalysisTab } from './Dashboard/AnalysisTab';
import TopicDetailModal from './Dashboard/TopicDetailModal';
import { TrendingUp, Map, MessageSquare } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setSelectedTopic } from '../../store/topicSlice';
import { clearChatHistory } from '../../store/chatSlice';
import ThemeMindmap from './Dashboard/ThemeMindmap';
import SyntheticCustomerPrompt from './Dashboard/SyntheticCustomerPrompt';
import { getSubredditStats } from '../../services/topicService';
import { TopicData, TopicTerm, Topic } from '../../types/TopicModeling';

// Define props interface using the TopicData type directly
interface TopicModelingResultsProps {
  loading: boolean;
  topicData: TopicData | null;
  onAnalyze?: () => void;
  currentSubreddit?: string; // Add a prop for the explicitly passed subreddit
}

export const TopicModelingResults = ({
  loading,
  topicData,
  onAnalyze,
  currentSubreddit
}: TopicModelingResultsProps) => {
  const [activeView, setActiveView] = useState('topics'); 
  const [statsLoading, setStatsLoading] = useState(false);
  const [topicStats, setTopicStats] = useState({ total_posts: 0, total_comments: 0 });
  
  // Get Redux dispatcher and selected topic from store
  const dispatch = useAppDispatch();
  const selectedTopic = useAppSelector(state => state.topic.selectedTopic);
  const subreddit = useAppSelector(state => state.topic.subreddit); // Get subreddit from Redux
  const topicProjectId = useAppSelector(state => state.topic.projectId); // Get the project id
  
  // Print topicData whenever it changes
  useEffect(() => {
    console.log('TopicModelingResults - Current topicData:', topicData);
    // Print with formatting for better readability
  }, [topicData]);
  
  // Extract subreddit from project data if not available directly
  const effectiveSubreddit = useMemo(() => {
    // First try to use the explicitly passed currentSubreddit prop
    if (currentSubreddit) {
      return currentSubreddit;
    }
    
    // Then try to get subreddit from the topicData props (if available)
    const topicDataSubreddit = topicData?.subreddit || null;
    
    if (topicDataSubreddit) {
      return topicDataSubreddit;
    }
    
    // Then fall back to the Redux store value
    if (subreddit) {
      return subreddit;
    }
    
    return '';
  }, [currentSubreddit, subreddit, topicData]);
  
  const handleCloseModal = () => {
    dispatch(setSelectedTopic(null));
  };
  
  const handleTopicSelect = (topic: Topic | null) => {
    dispatch(setSelectedTopic(topic));
  };
  
  // Handle switching tabs
  const handleTabChange = (view: string) => {
    setActiveView(view);
    
    // Clear chat history when switching to the prompt tab
    if (view === 'prompt') {
      dispatch(clearChatHistory());
    }
  };
  
  const prepareTopicForModal = (topic: Topic | null) => {
    if (!topic) return null;
    
    // Add console log to inspect the topic object
    console.log('Topic object in prepareTopicForModal:', topic);
    console.log('Topic sentiment_evidence:', topic.sentiment_evidence);
   
    return {
      id: topic.id,
      topic: topic.topic,
      count: topic.count,
      score: topic.score,
      sentiment: topic.sentiment,
      short_summary: topic.short_summary,
      one_sentence_summary: topic.one_sentence_summary,
      summary: {
        summary: topic.description || (typeof topic.summary === 'string' ? topic.summary : topic.summary?.summary) || '',
        key_points: [topic.description?.split('.')[0] || '...'],
        sentiment_distribution: {
          [topic.sentiment]: topic.count,
          // Add other sentiments with 0 count to ensure all three are represented
          positive: topic.sentiment === 'positive' ? topic.count : 0,
          negative: topic.sentiment === 'negative' ? topic.count : 0,
          neutral: topic.sentiment === 'neutral' ? topic.count : 0
        }
      },
      related_terms: topic.related_terms || topic.relatedTerms || [],
      theme_words: [topic.topic, ...(topic.related_terms || topic.relatedTerms || [])],
      post_ids: topic.post_ids || [],
      sources: [],
      keyword_filter: topic.topic,
      highlight_terms: topic.related_terms || topic.relatedTerms || [],
      terms: topic.terms || [],
      engagement: topic.engagement || {
        post_count: topic.count,
        total_comments: 0,
        total_score: 0,
        avg_comments_per_post: 0,
        avg_score_per_post: 0
      },
      post_sentiments: topic.post_sentiments,
      sentiment_evidence: topic.sentiment_evidence
    };
  };

  // Prepare topics for the mindmap
  const prepareTopicsForMindmap = () => {
    if (!topicData || !topicData.topics) return [];
    
    // Check if topics object exists and has the expected structure
    const positiveTopics = topicData.topics.positive?.topics || [];
    const neutralTopics = topicData.topics.neutral?.topics || [];
    const negativeTopics = topicData.topics.negative?.topics || [];
    
    const allTopics = [
      ...positiveTopics,
      ...neutralTopics,
      ...negativeTopics
    ];
    
    return allTopics.map(topic => ({
      id: topic.id,
      topic: topic.terms?.[0]?.term || `Topic ${topic.id}`,
      count: topic.count || 0,
      score: topic.score || 0,
      sentiment: topic.score > 0.25 ? 'positive' : (topic.score < -0.25 ? 'negative' : 'neutral'),
      relatedTerms: (topic.terms || []).slice(0, 7).map((t: TopicTerm) => t.term),
      related_terms: (topic.terms || []).slice(0, 7).map((t: TopicTerm) => t.term),
      description: typeof topic.summary === 'string' ? topic.summary : (topic.summary?.summary || ''),
      short_summary: topic.short_summary || '',
      post_sentiments: topic.post_sentiments || {},
      sentiment_evidence: topic.sentiment_evidence || {},
      terms: topic.terms || [],
      post_ids: topic.post_ids || [],
      engagement: topic.engagement || {
        post_count: topic.count || 0,
        total_comments: 0,
        total_score: 0,
        avg_comments_per_post: 0,
        avg_score_per_post: 0
      }
    }));
  };

  // Fetch subreddit stats when subreddit changes
  useEffect(() => {
    if (effectiveSubreddit && typeof effectiveSubreddit === 'string' && effectiveSubreddit.trim() !== '') {
      setStatsLoading(true);
      getSubredditStats(effectiveSubreddit.trim())
        .then(stats => {
          setTopicStats(stats);
        })
        .catch(error => {
          console.error('Error in stats fetch:', error);
        })
        .finally(() => {
          setStatsLoading(false);
        });
    }
  }, [effectiveSubreddit]);

  // Clear chat history when component mounts or when project ID changes
  useEffect(() => {
    dispatch(clearChatHistory());
  }, [dispatch, topicProjectId]);

  return (
    <div className="text-white rounded-lg overflow-hidden">
      {/* Render the TopicDetailModal at the top level */}
      {selectedTopic && (
        <TopicDetailModal 
          topic={prepareTopicForModal(selectedTopic)} 
          onClose={handleCloseModal} 
        />
      )}
      
      {/* Display keyword if present */}
      {topicData?.keyword && (
        <div className="bg-gray-800 p-3 mb-3 rounded-lg border border-gray-700">
          <span className="text-gray-400">Results filtered by keyword: </span>
          <span className="text-blue-400 font-semibold">{topicData.keyword}</span>
        </div>
      )}
      
      {/* Navigation Tabs */}
      <div className="border-b border-gray-400">
        <div className="flex justify-between items-center">
          <div className="flex space-x-1 overflow-x-auto">
            <button
              className={`px-4 py-3 flex items-center text-sm font-medium ${
                activeView === 'prompt'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => handleTabChange('prompt')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Ask AI
            </button>
            <button
              className={`px-4 py-3 flex items-center text-sm font-medium ${
                activeView === 'topics'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => handleTabChange('topics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Topics
            </button>
            <button
              className={`px-4 py-3 flex items-center text-sm font-medium ${
                activeView === 'mindmaps'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => handleTabChange('mindmaps')}
            >
              <Map className="w-4 h-4 mr-2" />
              Theme Mindmaps
            </button>
          </div>
          
          {loading || statsLoading ? (
            <div className="flex items-center space-x-4 px-4 text-sm text-slate-300">
              <div className="animate-pulse h-4 w-24 bg-slate-600 rounded"></div>
              <div className="animate-pulse h-4 w-24 bg-slate-600 rounded"></div>
            </div>
          ) : (
            <div className="flex items-center space-x-4 px-4 text-sm text-slate-300">
              {effectiveSubreddit && (
                <div className="flex items-center">
                  <span className="font-medium mr-2">Subreddit:</span>
                  <span className="text-blue-400">r/{effectiveSubreddit}</span>
                </div>
              )}
              <div className="flex items-center">
                <span className="font-medium mr-2">Posts:</span>
                <span>{topicData?.total_documents}</span>
              </div>
              {!topicData?.keyword && (
                <div className="flex items-center">
                  <span className="font-medium mr-2">Comments:</span>
                  <span>{topicStats.total_comments}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Analyzing topics...</p>
          </div>
        ) : activeView === 'prompt' ? (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <SyntheticCustomerPrompt />
          </div>
        ) : !topicData || !topicData.topics ? (
          <div className="text-center py-12">
            <div className="space-y-6">
              <div className="mx-auto max-w-md">
                <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32 mx-auto opacity-30">
                  <path d="M100 38C100 38 85 58 65 58C45 58 30 38 30 38C30 38 45 18 65 18C85 18 100 38 100 38Z" stroke="#666" strokeWidth="2"/>
                  <path d="M170 38C170 38 155 58 135 58C115 58 100 38 100 38C100 38 115 18 135 18C155 18 170 38 170 38Z" stroke="#666" strokeWidth="2"/>
                  <path d="M100 162C100 162 85 182 65 182C45 182 30 162 30 162C30 162 45 142 65 142C85 142 100 162 100 162Z" stroke="#666" strokeWidth="2"/>
                  <path d="M170 162C170 162 155 182 135 182C115 182 100 162 100 162C100 162 115 142 135 142C155 142 170 162 170 162Z" stroke="#666" strokeWidth="2"/>
                  <path d="M100 38L100 162" stroke="#666" strokeWidth="2"/>
                  <path d="M30 38L30 162" stroke="#666" strokeWidth="2"/>
                  <path d="M170 38L170 162" stroke="#666" strokeWidth="2"/>
                </svg>
              </div>
              <div>
                {effectiveSubreddit ? (
                  <div>
                    <p className="text-gray-300 mb-4">No topic modeling results available yet for r/{effectiveSubreddit}.</p>
                    {onAnalyze && (
                      <button 
                        onClick={onAnalyze}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Analyze Now
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-300 mb-4">No topic modeling results available yet. Enter a subreddit name and click "Analyze" to begin.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Content for each tab */}
            {activeView === 'prompt' && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <SyntheticCustomerPrompt />
              </div>
            )}
            {activeView === 'topics' && (
              <AnalysisTab topicData={topicData} />
            )}
            {activeView === 'mindmaps' && (
              <div>
                <ThemeMindmap 
                  topics={prepareTopicsForMindmap()} 
                  topicSimilarities={topicData?.topic_similarities || []}
                  onTopicSelect={handleTopicSelect} 
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ); 
}; 