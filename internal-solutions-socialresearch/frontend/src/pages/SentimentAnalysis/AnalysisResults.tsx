import { AnalysisDisplayProps, Category, Point, AnalysisData, Post, Comment } from '../../types/analysis';
import { useState, useRef, useEffect, useCallback } from 'react';
import { VisualizationTab } from '../../pages/SentimentAnalysis/Dashboard/VisualizationTab';
import { AnalysisTab } from '../../pages/SentimentAnalysis/Dashboard/AnalysisTab';
import { SummaryVisualization } from './Dashboard/SummaryVisualization';
import { AISummaryBox } from './Dashboard/AISummaryBox';
import { AISummaryResponse, getAISummaryByProjectId, regenerateAISummary } from '../../services/llmAnalyzer';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setAISummary, setAISummaryLoading, setAISummaryError } from '../../store/sentimentAnalysisSlice';
import { DateRangePicker } from './Dashboard/Date/DateRangePicker';
import './Dashboard/Date/datapicker-custome.css';

export const AnalysisResults = ({
  streamedJson,
  loading,
  isThinking,
  analysis,
  isPolling
}: AnalysisDisplayProps) => {
  const dispatch = useDispatch();
  // Tabs: 'formatted', 'summary', 'analysis', 'visualization'
  const [activeTab, setActiveTab] = useState<'formatted' | 'summary' | 'analysis' | 'visualization'>('summary');
  const [dateRange, setDateRange] = useState<{
    fromYear: string | null;
    fromMonth: string | null;
    toYear: string | null;
    toMonth: string | null;
  }>({
    fromYear: null,
    fromMonth: null,
    toYear: null,
    toMonth: null
  });
  
  // Add state for tracking expanded categories in the detailed analysis tab
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Add state to control which category should be automatically expanded and scrolled to
  const [targetCategory, setTargetCategory] = useState<{sentiment: string, index: number, id: string} | null>(null);
  
  // Add state to store the count of posts matching the date filter
  const [filteredPostCount, setFilteredPostCount] = useState<number>(0);

  // Add safe check for analysis data
  const analysisData = analysis?.merged_result;

  // Get project ID and existing AI summary from Redux
  const projectId = useSelector((state: RootState) => state.sentimentAnalysis.projectId);
  const reduxAISummary = useSelector((state: RootState) => state.sentimentAnalysis.ai_summary);
  // Get AI summary loading and error states from Redux
  const reduxAISummaryLoading = useSelector((state: RootState) => state.sentimentAnalysis.aiSummaryLoading);
  const reduxAISummaryError = useSelector((state: RootState) => state.sentimentAnalysis.aiSummaryError);

  // Add these states to the AnalysisResults component
  const [aiSummaryData, setAiSummaryData] = useState<AISummaryResponse | null>(reduxAISummary);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(reduxAISummaryLoading || false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(reduxAISummaryError || null);
  const aiSummaryFetchedRef = useRef(false);

  // Helper function to convert timestamp to Date object
  const getDateFromTimestamp = useCallback((timestamp: string): Date | null => {
    try {
      // Check if it's a numeric string (likely a Unix timestamp)
      if (/^\d+$/.test(timestamp)) {
        const timestampNum = parseInt(timestamp);
        // Convert seconds to milliseconds if needed
        const milliseconds = timestampNum > 10000000000 ? timestampNum : timestampNum * 1000;
        const date = new Date(milliseconds);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Try standard date parsing as fallback
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) ? date : null;
    } catch (e) {
      console.error("Failed to parse date:", timestamp, e);
      return null;
    }
  }, []);

  // Helper function to check if a post is within date range
  const isWithinDateRange = useCallback((timestamp: string) => {
    const postDate = getDateFromTimestamp(timestamp);
    if (!postDate) return true; // If can't parse date, include it

    // If no date range is set, show all posts
    if (!dateRange?.fromYear && !dateRange?.toYear) return true;

    // Check if post is within the date range
    let fromDate = null;
    if (dateRange.fromYear && dateRange.fromMonth) {
      fromDate = new Date(parseInt(dateRange.fromYear), parseInt(dateRange.fromMonth) - 1, 1);
      fromDate.setHours(0, 0, 0, 0); // Start of day
    }
    
    let toDate = null;
    if (dateRange.toYear && dateRange.toMonth) {
      // Get last day of month
      const lastDay = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth), 0).getDate();
      toDate = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth) - 1, lastDay);
      toDate.setHours(23, 59, 59, 999); // End of day
    }

    if (fromDate && toDate) {
      return postDate >= fromDate && postDate <= toDate;
    } else if (fromDate) {
      return postDate >= fromDate;
    } else if (toDate) {
      return postDate <= toDate;
    }

    return true;
  }, [dateRange, getDateFromTimestamp]);

  // Helper function to get the latest date from the data
  const getLatestDate = (analysis: AnalysisData | null): string | undefined => {
    if (!analysis?.formatted_data?.results) return undefined;
    
    const dates = analysis.formatted_data.results
      .map((post: Post) => getDateFromTimestamp(post.created_utc))
      .filter((date: Date | null): date is Date => date !== null);
    
    if (dates.length === 0) return undefined;
    
    const latestDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
    
    // Return the raw timestamp if possible
    const latestPost = analysis.formatted_data.results.find((post: Post) => {
      const postDate = getDateFromTimestamp(post.created_utc);
      return postDate && postDate.getTime() === latestDate.getTime();
    });
    
    if (latestPost) {
      return latestPost.created_utc; // Return raw timestamp for accurate parsing
    }
    
    return latestDate.toISOString().split('T')[0]; // Fallback to ISO format
  };

  // Handler for navigating to a specific category in the detailed analysis
  const handleCategoryClick = (sentiment: string, index: number) => {
    // Set the active tab to 'analysis'
    setActiveTab('analysis');
    
    // Calculate the ID for the target category
    const categoryId = `category-${sentiment}-${index}`;
    
    // Set the target category to be expanded and scrolled to
    setTargetCategory({ sentiment, index, id: categoryId });
    
    // Update expanded categories state immediately
    setExpandedCategories(prev => ({
      ...prev,
      [`${sentiment}-${index}`]: true
    }));
  };

  // Handler for toggling expand/collapse all for a sentiment in the detailed view
  const handleToggleExpandAll = (sentiment: string, expand: boolean) => {
    if (!analysisData || !analysisData[sentiment as keyof typeof analysisData]) return;
    
    setExpandedCategories(prev => {
      const updated = { ...prev };
      analysisData[sentiment as keyof typeof analysisData].forEach((_: Category, index: number) => {
        updated[`${sentiment}-${index}`] = expand;
      });
      return updated;
    });
  };

  // Effect to handle category expansion and scrolling when the tab changes
  useEffect(() => {
    // If we've navigated to the analysis tab and there's a target category
    if (activeTab === 'analysis' && targetCategory) {
      // Ensure the category is marked as expanded
      setExpandedCategories(prev => ({
        ...prev,
        [`${targetCategory.sentiment}-${targetCategory.index}`]: true
      }));
      
      // Use setTimeout to allow the DOM to update before scrolling
      const timer = setTimeout(() => {
        const element = document.getElementById(targetCategory.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Clear the target category after scrolling
        setTargetCategory(null);
      }, 100); // Delay might need adjustment

      return () => clearTimeout(timer); // Cleanup timer on unmount or change
    }
  }, [activeTab, targetCategory]);


  useEffect(() => {
    // Use project ID from analysis or from Redux
    const effectiveProjectId = analysis?.analysis_id || projectId;

    if (!effectiveProjectId || aiSummaryFetchedRef.current || reduxAISummary) {
      // If summary is already in Redux, ensure local state matches
      if (reduxAISummary && aiSummaryData !== reduxAISummary) {
        setAiSummaryData(reduxAISummary);
      }
      return;
    }

    const fetchAISummary = async () => {
      aiSummaryFetchedRef.current = true; // Mark as attempted fetch
      try {
        setAiSummaryLoading(true);
        const summaryData = await getAISummaryByProjectId(effectiveProjectId);
        setAiSummaryData(summaryData); // Update local state
        dispatch(setAISummary(summaryData)); // Dispatch to update Redux state
        setAiSummaryError(null);
      } catch (err) {
        console.error("[AnalysisResults] Error fetching AI summary:", err);
        setAiSummaryError('Failed to fetch AI summary.');
        // Optionally clear summary in Redux on fetch error?
        // dispatch(setAISummary(null));
      } finally {
        setAiSummaryLoading(false);
      }
    };

    fetchAISummary();
    // Depend on projectId, analysis?.analysis_id, dispatch, and reduxAISummary
  }, [analysis?.analysis_id, projectId, dispatch, reduxAISummary, aiSummaryData]);

  // Effect to sync local state if Redux summary changes (e.g., after regeneration)
  useEffect(() => {
    if (reduxAISummary && aiSummaryData !== reduxAISummary) {
      console.log("[AnalysisResults] Syncing local AI summary state with Redux.");
      setAiSummaryData(reduxAISummary);
      // Also clear any errors and set loading to false since we now have data
      setAiSummaryError(null);
      setAiSummaryLoading(false);
    }
  }, [reduxAISummary, aiSummaryData]);

  // Effect to sync local state with Redux for AI summary loading and error
  useEffect(() => {
    setAiSummaryLoading(reduxAISummaryLoading || false);
  }, [reduxAISummaryLoading]);

  useEffect(() => {
    setAiSummaryError(reduxAISummaryError);
  }, [reduxAISummaryError]);

  // Filter analysis data by date range
  const getFilteredAnalysisData = () => {
    if (!analysisData || !analysis?.formatted_data?.results) {
      return analysisData;
    }

    // Get posts within date range
    const postsInRange = analysis.formatted_data.results.filter((post: Post) => 
      isWithinDateRange(post.created_utc)
    );
    
    // Get post IDs that are in range
    const postIdsInRange = new Set(postsInRange.map((post: Post) => 
      [`post${post.id}`, `post ${post.id}`]
    ).flat());

    // Filter points in each category to only include evidence from posts in range
    const filteredData = {
      positive: analysisData.positive.map((category: Category) => ({
        ...category,
        points: category.points.filter((point: Point) => {
          // Check if any evidence is from posts in range
          const hasEvidenceInRange = Object.keys(point.evidence).some(postId => 
            postIdsInRange.has(postId)
          );
          return hasEvidenceInRange;
        })
      })).filter((category: Category) => category.points.length > 0),
      
      negative: analysisData.negative.map((category: Category) => ({
        ...category,
        points: category.points.filter((point: Point) => {
          // Check if any evidence is from posts in range
          const hasEvidenceInRange = Object.keys(point.evidence).some(postId => 
            postIdsInRange.has(postId)
          );
          return hasEvidenceInRange;
        })
      })).filter((category: Category) => category.points.length > 0)
    };

    return filteredData;
  };

  // Effect to calculate filtered post count
  useEffect(() => {
    if (analysis?.formatted_data?.results) {
      const posts = Array.isArray(analysis.formatted_data.results) ? analysis.formatted_data.results : [];
      const filteredPosts = posts.filter(post => isWithinDateRange(post.created_utc));
      setFilteredPostCount(filteredPosts.length);
    } else {
      setFilteredPostCount(0); // Reset if no data
    }
  }, [analysis, dateRange, isWithinDateRange]); 

  // Add a function to handle AI summary refresh
  const handleAISummaryRefresh = async () => {
    // Use project ID from analysis or from Redux
    const effectiveProjectId = analysis?.analysis_id || projectId;

    if (!effectiveProjectId) {
      dispatch(setAISummaryError('Cannot refresh summary without a Project ID.'));
      return;
    }

    try {
      // Set loading state in Redux - this will propagate to UI through the effects
      dispatch(setAISummaryLoading(true));
      // Clear any previous errors
      dispatch(setAISummaryError(null));

      // Always use regenerateAISummary if possible, passing filtered data
      // The backend should handle fetching if regeneration isn't needed/possible
      const filteredData = getFilteredAnalysisData();
      
      // Only proceed if we have filtered data to work with
      if (!filteredData) {
        throw new Error('No analysis data available to refresh summary');
      }
      
      console.log(`[AnalysisResults] Regenerating AI summary for project ID: ${effectiveProjectId}`);
      const regeneratedSummary = await regenerateAISummary(filteredData, effectiveProjectId);
      console.log("[AnalysisResults] Regenerated AI Summary:", regeneratedSummary);

      // Update Redux state, which will propagate to local state through effects
      dispatch(setAISummary(regeneratedSummary));

    } catch (err) {
      console.error("[AnalysisResults] Error refreshing AI summary:", err);
      dispatch(setAISummaryError('Failed to refresh AI summary. Please try again later.'));
    } finally {
      // Ensure loading state is reset in Redux
      dispatch(setAISummaryLoading(false));
    }
  };

  // Loading and error state displays
  if (loading) {
    return (
      <div className="p-6 rounded-xl shadow-xl border border-gray-700 min-h-screen" style={{ backgroundColor: 'rgba(34,38,43,255)' }}>
        {isPolling ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="text-blue-400 font-medium">Analysis job in progress...</p>
            </div>
            <p className="text-gray-300">
              {streamedJson || 'Your analysis is being processed. This may take several minutes for large datasets.'}
            </p>
            <div className="mt-4 bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
              <p className="mb-2 text-gray-300 font-medium">Why is this taking time?</p>
              <p>
                Sentiment analysis involves multiple complex steps including data collection, 
                AI processing, and result merging. You can continue using other parts of the 
                application while waiting - your results will be displayed as soon as they're ready.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-300">
            {isThinking ? 'Analyzing sentiment...' : 
             streamedJson?.includes('Processed chunk') ? 
               streamedJson : 'Processing...'}
          </p>
        )}
      </div>
    );
  }

  // Function to render analysis summary (condensed version of analysis tab)
  const renderAnalysisSummary = () => {
    if (!analysisData) {
      return <p className="text-gray-300">No sentiment analysis results available yet. Click "Analyze" to begin.</p>;
    }

    // Get filtered data based on date range
    const filteredData = getFilteredAnalysisData();
    
    // Return early if no filtered data is available
    if (!filteredData) {
      return <p className="text-gray-300">No data available for the selected date range.</p>;
    }

    // Create a copy of the data to avoid modifying the original
    const positiveCategories = [...filteredData.positive].sort((a, b) => {
      const totalA = a.points.reduce((sum: number, point: Point) => sum + point.frequency, 0);
      const totalB = b.points.reduce((sum: number, point: Point) => sum + point.frequency, 0);
      return totalB - totalA;
    });

    const negativeCategories = [...filteredData.negative].sort((a, b) => {
      const totalA = a.points.reduce((sum: number, point: Point) => sum + point.frequency, 0);
      const totalB = b.points.reduce((sum: number, point: Point) => sum + point.frequency, 0);
      return totalB - totalA;
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Summary Box */}
        <div className="md:col-span-2">
          <AISummaryBox 
            analysisData={analysisData}
            aiSummary={aiSummaryData}
            loading={aiSummaryLoading}
            error={aiSummaryError}
            skipFetch={true}
            dateRange={dateRange}
            analysis={analysis}
            onRefresh={handleAISummaryRefresh}
          />
        </div>
        
        {/* Sentiment Overview Section - Contains both positive and negative feedback */}
        <div className="md:col-span-2">
          <div className="p-4 rounded-lg border border-gray-700 bg-[rgba(45,46,49,255)] mb-6">
            <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
              <span className="mr-2">🔍</span> Sentiment Analysis
            </h2>
            <p className="text-gray-300 mb-4">
              Below is a summary of the sentiment analysis results, organized by category.
              Each point shows its frequency in the analyzed data. Click on any category to see detailed analysis.
            </p>
            
            {/* Feedback Categories Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Positive Categories */}
              <div>
                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center">
                  <span className="mr-2">✓</span> Positive Feedback
                </h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-custom">
                  {positiveCategories.map((category, index) => (
                    <div 
                      key={`pos-${index}`} 
                      className="p-4 rounded-lg border border-gray-700 hover:border-green-700 transition-colors cursor-pointer" 
                      style={{ backgroundColor: 'rgba(55,56,59,255)' }}
                      onClick={() => handleCategoryClick('positive', index)}
                    >
                      <h4 className="text-lg font-medium text-green-400 mb-3 border-b border-gray-700 pb-2 flex items-center justify-between">
                        {category.category}
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4 text-green-400" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </h4>
                      <ul className="space-y-3">
                        {category.points.map((point: Point, pointIndex: number) => (
                          <li key={`pos-${index}-${pointIndex}`} className="flex items-start group">
                            <div className="flex-1">
                              <span className="text-gray-300 group-hover:text-white transition-colors">{point.point}</span>
                            </div>
                            <span className="ml-3 px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded-full flex-shrink-0">
                              {point.frequency}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Negative Categories */}
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center">
                  <span className="mr-2">⚠</span> Negative Feedback
                </h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-custom">
                  {negativeCategories.map((category, index) => (
                    <div 
                      key={`neg-${index}`} 
                      className="p-4 rounded-lg border border-gray-700 hover:border-red-700 transition-colors cursor-pointer" 
                      style={{ backgroundColor: 'rgba(55,56,59,255)' }}
                      onClick={() => handleCategoryClick('negative', index)}
                    >
                      <h4 className="text-lg font-medium text-red-400 mb-3 border-b border-gray-700 pb-2 flex items-center justify-between">
                        {category.category}
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4 text-red-400" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </h4>
                      <ul className="space-y-3">
                        {category.points.map((point: Point, pointIndex: number) => (
                          <li key={`neg-${index}-${pointIndex}`} className="flex items-start group">
                            <div className="flex-1">
                              <span className="text-gray-300 group-hover:text-white transition-colors">{point.point}</span>
                            </div>
                            <span className="ml-3 px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded-full flex-shrink-0">
                              {point.frequency}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Summary Visualization */}
        <div className="md:col-span-2">
          <SummaryVisualization 
            analysisData={analysisData} 
            filteredData={filteredData}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 rounded-xl shadow-xl border border-gray-700 min-h-screen scrollbar-custom" style={{ backgroundColor: 'rgba(34,38,43,255)' }}>
      {/* Tab Navigation with Date Picker */}
      <div className="flex justify-between mb-6 border-b border-gray-700 pb-2">
        <div className="flex overflow-x-auto scrollbar-custom">
          {[
            { id: 'formatted', label: 'Original Data' },
            { id: 'summary', label: 'Analysis Summary' },
            { id: 'analysis', label: 'Detail Analysis' },
            { id: 'visualization', label: 'Visualization (Beta)' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'formatted' | 'summary' | 'analysis' | 'visualization')}
              className={`px-4 py-2 mr-2 rounded-t-lg transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-blue-400 hover:bg-[rgba(65,66,69,255)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Date Picker and Post Count - Only show if we have analysis data */}
        {analysisData && (
          <div className="flex items-center flex-shrink-0 ml-4">
            {/* Date Range Picker */}
            <DateRangePicker
              onChange={setDateRange}
              maxDate={getLatestDate(analysis)}
            />
            {/* Display Filtered Post Count - styled to match date picker */}
            <span className="flex items-center text-sm text-gray-300 bg-gray-800 border border-gray-700 px-4 py-2 rounded ml-3 whitespace-nowrap">
              Displaying <span className="font-medium ml-1 mr-1">{filteredPostCount}</span> posts
            </span>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="overflow-auto scrollbar-custom" style={{ maxHeight: 'calc(100vh - 160px)' }}>
       
        {/* Filtered & Formatted Data Tab */}
        {activeTab === 'formatted' && (
          analysis?.formatted_data ? (
            <div className="space-y-6">
              {Object.entries(analysis.formatted_data)
                .filter(([key]) => key === 'results')
                .map(([, value]) => {
                  // Ensure value is an array before filtering
                  const posts = Array.isArray(value) ? value : [];
                  
                  // Filter posts by date range
                  const filteredPosts = posts.filter(post => isWithinDateRange(post.created_utc));
                  
                  return filteredPosts.map((post) => (
                    <div key={post.id} className="p-6 rounded-lg border border-gray-700" style={{ backgroundColor: 'rgba(55,56,59,255)' }}>
                      <h3 className="text-sm font-semibold text-blue-400 mb-2">Post {post.id}</h3>
                      
                      {/* Post Header */}
                      <div className="mb-4">
                        <h4 className="text-lg font-medium text-white">{post.title}</h4>
                        <div className="flex gap-3 text-xs text-gray-400 mt-1">
                          <span>Score: {post.score}</span>
                          <span>Posted: {post.created_utc}</span>
                        </div>
                      </div>

                      {/* Post Content */}
                      {post.selftext && (
                        <p className="text-gray-300 mb-4">{post.selftext}</p>
                      )}

                      {/* Comments Section */}
                      <div className="space-y-4 mt-4 border-t border-gray-700 pt-4">
                        {post.comments?.map((comment: Comment, index: number) => (
                          <div key={index} className="pl-4 border-l-2 border-gray-700">
                            <div className="text-gray-300">{comment.body}</div>
                            <div className="flex gap-3 text-xs text-gray-400 mt-1">
                              <span>Score: {comment.score}</span>
                              <span>Posted: {comment.created_utc}</span>
                            </div>
                            
                            {/* Nested Replies */}
                            {comment.replies?.map((reply: Comment, replyIndex: number) => (
                              <div key={replyIndex} className="ml-4 mt-2 pl-4 border-l-2 border-gray-700">
                                <div className="text-gray-300">{reply.body}</div>
                                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                                  <span>Score: {reply.score}</span>
                                  <span>Posted: {reply.created_utc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))} 
                      </div>
                    </div>
                  ));
                })}
            </div>
          ) : (
            <p className="text-gray-300">No sentiment analysis results available yet. Click "Analyze" to begin.</p>
          )
        )}

        {/* Analysis Summary Tab */}
        {activeTab === 'summary' && renderAnalysisSummary()}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          analysisData ? (
            <AnalysisTab
              analysisData={analysisData}
              analysis={analysis}
              isFullScreen={true}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              showDatePicker={false}
              expandedCategories={expandedCategories}
              onToggleCategory={(sentiment: string, idx: number) => {
                const key = `${sentiment}-${idx}`;
                setExpandedCategories(prev => ({
                  ...prev,
                  [key]: !prev[key]
                }));
              }}
              onToggleExpandAll={handleToggleExpandAll}
            />
          ) : (
            <p className="text-gray-300">No sentiment analysis results available yet. Click "Analyze" to begin.</p>
          )
        )}

        {/* Visualization Tab */}
        {activeTab === 'visualization' && (
          analysisData ? (
            <VisualizationTab 
              analysisData={analysisData} 
              filteredData={getFilteredAnalysisData()}
            />
          ) : (
            <p className="text-gray-300">No sentiment analysis results available yet. Click "Analyze" to begin.</p>
          )
        )}
      </div>
    </div>
  );
}; 