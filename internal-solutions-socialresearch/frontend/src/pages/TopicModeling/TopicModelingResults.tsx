import { useState, useEffect, useMemo } from 'react';
import { AnalysisTab } from './Dashboard/AnalysisTab';
import TopicDetailModal from './Dashboard/TopicDetailModal';
import { TrendingUp, Map, MessageSquare, XCircle, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setSelectedTopic } from '../../store/topicSlice';
import { clearChatHistory } from '../../store/chatSlice';
import ThemeMindmap from './Dashboard/ThemeMindmap';
import SyntheticCustomerPrompt from './Dashboard/SyntheticCustomerPrompt';
import { TopicData, TopicTerm, Topic } from '../../types/TopicModeling';
import { useTopicModeling } from '../../hooks/useTopicModeling';

// Define props interface using the TopicData type directly
interface TopicModelingResultsProps {
  loading: boolean;
  topicData: TopicData | null;
  onAnalyze?: () => void;
  currentSubreddit?: string; // Add a prop for the explicitly passed subreddit
  jobProgress?: number | null; // Add prop for job progress
  jobMessage?: string; // Add prop for job message
}

// Define the processing stages for topic modeling
const TOPIC_MODELING_STAGES = [
  { progress: 8, message: 'Fetching posts from Reddit', timeEstimate: '~5-20 min' },
  { progress: 20, message: 'Processing posts for analysis', timeEstimate: '~2 mins' },
  { progress: 50, message: 'Analyzing topics', timeEstimate: '~10-30 mins' },
  { progress: 60, message: 'Calculating topic similarities', timeEstimate: '~5 mins' },
  { progress: 70, message: 'Generating summaries and metrics', timeEstimate: '10~30 min' },
  { progress: 80, message: 'Sentiment analysis and evidence point extraction', timeEstimate: '0.5-2 hours' },
  { progress: 100, message: 'Saving results', timeEstimate: '<1 min' }
];

export const TopicModelingResults = ({
  loading,
  topicData,
  onAnalyze,
  currentSubreddit,
  jobProgress,
  jobMessage
}: TopicModelingResultsProps) => {
  const [activeView, setActiveView] = useState('topics'); 
  
  // Import the cancelCurrentProject function from the hook
  const { jobStatus, cancelCurrentProject } = useTopicModeling();
  
  // Get Redux dispatcher and selected topic from store
  const dispatch = useAppDispatch();
  const selectedTopic = useAppSelector(state => state.topic.selectedTopic);
  const subreddit = useAppSelector(state => state.topic.subreddit); // Get subreddit from Redux
  const topicProjectId = useAppSelector(state => state.topic.projectId); // Get the project id
  // Find the current stage based on job progress
  const getCurrentStage = () => {
    if (jobProgress === null || jobProgress === undefined) return -1;
    
    for (let i = TOPIC_MODELING_STAGES.length - 1; i >= 0; i--) {
      if (jobProgress >= TOPIC_MODELING_STAGES[i].progress) {
        return i;
      }
    }
    return 0;
  };
  
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

  // Handler for cancelling all jobs in the current project
  const handleCancelJob = async () => {
    const confirmMessage = 'Are you sure you want to cancel all topic modeling jobs for this project? This action cannot be undone.';
    
    if (window.confirm(confirmMessage)) {
      try {
        const result = await cancelCurrentProject();
        console.log('Project cancellation result:', result);
        // Additional UI feedback could be added here
      } catch (err) {
        console.error('Failed to cancel project jobs:', err);
        // Could show an error toast or notification here
      }
    }
  };
  
  const prepareTopicForModal = (topic: Topic | null) => {
    if (!topic) return null;
    
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

  // Clear chat history when component mounts or when project ID changes
  useEffect(() => {
    dispatch(clearChatHistory());
  }, [dispatch, topicProjectId]);

  // Render progress checklist component
  const renderProgressChecklist = () => {
    const currentStageIndex = getCurrentStage();
    
    // Check if job was cancelled
    if (jobStatus === 'cancelled') {
      return (
        <div className="w-full max-w-lg mx-auto">
          <div className="flex items-center justify-center mb-3">
            <div className="text-red-600 font-medium flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              Topic modeling job was cancelled
            </div>
          </div>

          <div className="space-y-2 mt-4 bg-[#fafafa] p-4 rounded-lg border border-[#e5e5e5]">
            <div className="text-center">
              <p className="text-[#525252] mb-2">The topic modeling process was cancelled.</p>
              <p className="text-[#525252] text-sm">You can start a new analysis at any time.</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[#115054] font-medium flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#115054] mr-2"></div>
            Topic modeling in progress...
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCancelJob}
              className="flex items-center text-red-600 hover:text-red-700 transition-colors text-sm"
              title="Cancel all jobs for this project"
            >
              <XCircle className="w-4 h-4 mr-1" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
          
        <div className="space-y-2 mt-4 bg-[#fafafa] p-4 rounded-lg border border-[#e5e5e5]">
          {TOPIC_MODELING_STAGES.map((stage, index) => {
            // Determine the status of this stage
            const isCompleted = currentStageIndex > index;
            const isCurrent = currentStageIndex === index;
            const isPending = currentStageIndex < index;

            return (
              <div
                key={index}
                className={`flex items-center p-2 rounded-md transition-colors ${
                  isCurrent ? 'bg-blue-50' :
                  isCompleted ? 'bg-[#f5f5f5]' : ''
                }`}
              >
                <div className="mr-3">
                  {isCompleted && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {isCurrent && (
                    <Clock className="h-5 w-5 text-[#115054] animate-pulse" />
                  )}
                  {isPending && (
                    <Circle className="h-5 w-5 text-[#acacac]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    isCurrent ? 'text-[#115054]' :
                    isCompleted ? 'text-green-600' :
                    'text-[#525252]'
                  }`}>
                    {stage.message}
                  </div>
                </div>
                <div className="text-xs text-[#acacac] ml-2">
                  {stage.timeEstimate}
                </div>
              </div>
            );
          })}
        </div>

        {jobMessage && jobMessage !== TOPIC_MODELING_STAGES[currentStageIndex]?.message && (
          <div className="mt-3 text-sm text-[#525252]">
            <span className="font-medium">Current operation:</span> {jobMessage}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="text-[#141414] rounded-lg overflow-hidden">
      {/* Render the TopicDetailModal at the top level */}
      {selectedTopic && (
        <TopicDetailModal 
          topic={prepareTopicForModal(selectedTopic)} 
          onClose={handleCloseModal} 
        />
      )}
      
      {/* Display keyword if present */}
      {topicData?.keyword && (
        <div className="bg-[#fafafa] p-3 mb-3 rounded-lg border border-[#e5e5e5]">
          <span className="text-[#525252]">Results filtered by keyword: </span>
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
                  : 'text-[#525252] hover:text-[#141414]'
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
                  : 'text-[#525252] hover:text-[#141414]'
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
                  : 'text-[#525252] hover:text-[#141414]'
              }`}
              onClick={() => handleTabChange('mindmaps')}
            >
              <Map className="w-4 h-4 mr-2" />
              Theme Mindmaps
            </button>
          </div>
          
          {/* Only show subreddit info if there are results */}
          {(!topicData || !topicData.topics) ? null : (
            loading ? (
              <div className="flex items-center space-x-4 px-4 text-sm text-[#525252]">
                <div className="animate-pulse h-4 w-24 bg-[#e5e5e5] rounded"></div>
              </div>
            ) : (
              <div className="flex items-center space-x-4 px-4 text-sm text-[#525252]">
                {effectiveSubreddit && effectiveSubreddit.trim() !== '' && (
                  <div className="flex items-center">
                    <span className="font-medium mr-2">Subreddit:</span>
                    <span className="text-blue-400">r/{effectiveSubreddit}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <span className="font-medium mr-2">Posts:</span>
                  <span>{topicData.total_documents || 0}</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            {/* Display checklist progress if jobProgress is available */}
            {jobProgress !== null && jobProgress !== undefined ? (
              renderProgressChecklist()
            ) : (
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-[#525252]">Analyzing topics...</p>
              </div>
            )}
            <div className="mt-4 flex flex-col lg:flex-row gap-4 max-w-4xl mx-auto">
              <div className="flex-1 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4 text-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-blue-300 font-medium mb-1">You can leave this page</p>
                    <p className="text-blue-200">
                      The analysis is running on our servers. Feel free to close this tab or navigate away - 
                      you can return anytime to check the progress or view results when complete.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-[#fafafa] rounded-lg p-4 text-sm text-[#525252]">
                <p className="mb-2 text-[#525252] font-medium">Why is this taking time?</p>
                <p>
                  Topic modeling involves multiple complex steps including data collection, 
                  topic extraction, sentiment analysis, evidence point extraction through LLM. The most 
                  time-intensive steps are processing the posts and extracting evidence points, 
                  which can take several minutes to several hours for large subreddits. Times vary based on the number of posts.
                </p>
              </div>
            </div>
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
                {effectiveSubreddit && effectiveSubreddit.trim() !== '' ? (
                  <div>
                    <p className="text-[#525252] mb-4">No topic modeling results available yet for r/{effectiveSubreddit}.</p>
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
                  <p className="text-[#525252] mb-4">No topic modeling results available yet. Enter a subreddit name and click "Analyze" to begin.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Low post count warning */}
            {topicData && topicData.total_documents && topicData.total_documents < 150 && (
              <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-yellow-700 font-medium mb-2">Limited Data Warning</p>
                    <p className="text-yellow-700 mb-3">
                      Only {topicData.total_documents} posts were analyzed. For better topic modeling results, consider:
                    </p>
                    <ul className="text-yellow-700 text-sm space-y-1 mb-3">
                      <li>- <strong>Expanding the date range</strong> to include more historical posts</li>
                      <li>- <strong>Checking activity levels</strong> - some subreddits have seasonal posting patterns</li>
                      <li>- <strong>Verifying subreddit activity</strong> by visiting{' '}
                        <a
                          href={`https://reddit.com/r/${effectiveSubreddit}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#115054] underline hover:text-[#141414]"
                        >
                          r/{effectiveSubreddit}
                        </a>{' '}
                        to see recent post frequency
                      </li>
                    </ul>
                    <p className="text-yellow-700 text-sm">
                      <strong>Recommendation:</strong> Aim for at least 150 posts for more reliable topic insights, and remember the more posts, the better the results!
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Content for each tab */}
            {activeView === 'prompt' && (
              <div className="bg-[#fafafa] rounded-lg p-6 border border-[#e5e5e5]">
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