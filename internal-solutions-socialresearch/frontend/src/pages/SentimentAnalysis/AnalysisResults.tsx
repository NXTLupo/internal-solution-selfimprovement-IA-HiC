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
import { XCircle, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useRedditAnalysis } from '../../hooks/useLLMAnalyzer';

const LLM_ANALYZER_STAGES = [
  { progress: 1, message: 'Searching Reddit posts', timeEstimate: '~2-10 mins' },
  { progress: 25, message: 'Processing and chunking data for analysis', timeEstimate: '~1 min' },
  { progress: 30, message: 'Processing chunks with LLMs', timeEstimate: '~10-30 mins' },
  { progress: 85, message: 'Merging analysis results', timeEstimate: '~2-5 mins' },
  { progress: 98, message: 'Generating AI summary', timeEstimate: '~2-5 mins' },
  { progress: 100, message: 'Analysis completed', timeEstimate: '<1 min' }
];

export const AnalysisResults = ({
  streamedJson,
  loading,
  isThinking,
  analysis,
  isPolling
}: AnalysisDisplayProps) => {
  const dispatch = useDispatch();
  
  // Import the cancelCurrentProject function from the hook
  const { cancelCurrentProject } = useRedditAnalysis();
  
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

  // Add state for job progress - extract from Redux or props
  const jobProgress = useSelector((state: RootState) => state.sentimentAnalysis.jobProgress);
  const jobStatus = useSelector((state: RootState) => state.sentimentAnalysis.jobStatus);
  const jobMessage = useSelector((state: RootState) => state.sentimentAnalysis.jobMessage);

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

  // Find the current stage based on job progress
  const getCurrentStage = () => {
    if (jobProgress === null || jobProgress === undefined) return -1;
    
    for (let i = LLM_ANALYZER_STAGES.length - 1; i >= 0; i--) {
      if (jobProgress >= LLM_ANALYZER_STAGES[i].progress) {
        return i;
      }
    }
    return 0;
  };

  // Handler for cancelling all jobs in the current project
  const handleCancelJob = async () => {
    const confirmMessage = 'Are you sure you want to cancel all sentiment analysis jobs for this project? This action cannot be undone.';
    
    if (window.confirm(confirmMessage)) {
      try {
        const result = await cancelCurrentProject();
        if (result.cancelled_job_count > 0) {
          console.log(`Successfully cancelled ${result.cancelled_job_count} jobs for project ${result.project_id}`);
        } else {
          console.log('No active jobs found to cancel for this project.');
        }

      } catch (err) {
        console.error('Failed to cancel project jobs:', err);
        
        // Show error feedback to user
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        alert(`Failed to cancel project: ${errorMessage}`);
      }
    }
  };

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
              Sentiment analysis job was cancelled
            </div>
          </div>

          <div className="space-y-2 mt-4 bg-[#fafafa] p-4 rounded-lg border border-[#e5e5e5]">
            <div className="text-center">
              <p className="text-[#525252] mb-2">The sentiment analysis process was cancelled.</p>
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
            Sentiment analysis in progress...
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
          {LLM_ANALYZER_STAGES.map((stage, index) => {
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

        {jobMessage && jobMessage !== LLM_ANALYZER_STAGES[currentStageIndex]?.message && (
          <div className="mt-3 text-sm text-[#525252]">
            <span className="font-medium">Current operation:</span> {jobMessage}
          </div>
        )}
      </div>
    );
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

  // Reset the aiSummaryFetchedRef when projectId changes
  useEffect(() => {
    // Reset the fetch flag when project ID changes
    aiSummaryFetchedRef.current = false;
  }, [projectId]);

  useEffect(() => {
    // Use project ID from analysis or from Redux
    const effectiveProjectId = analysis?.analysis_id || projectId;
    if (!effectiveProjectId || 
        aiSummaryFetchedRef.current || 
        reduxAISummary || 
        reduxAISummaryLoading) {
      if (reduxAISummary && aiSummaryData !== reduxAISummary) {
        setAiSummaryData(reduxAISummary);
      }
      return;
    }

    const fetchAISummary = async () => {
      aiSummaryFetchedRef.current = true;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.analysis_id, projectId, dispatch, reduxAISummary, reduxAISummaryLoading]);

  // Effect to sync local state if Redux summary changes (e.g., after regeneration)
  useEffect(() => {
    if (reduxAISummary && aiSummaryData !== reduxAISummary) {
      console.log("[AnalysisResults] Syncing local AI summary state with Redux.");
      setAiSummaryData(reduxAISummary);
      // Also clear any errors and set loading to false since we now have data
      setAiSummaryError(null);
      setAiSummaryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxAISummary]);

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
      <div className="p-6 rounded-xl border border-[#e5e5e5] min-h-screen" style={{ backgroundColor: '#ffffff' }}>
        {isPolling ? (
          <div className="space-y-4">
            {/* Show progress checklist if jobProgress is available */}
            {jobProgress !== null && jobProgress !== undefined ? (
              <div className="text-center py-1">
                {renderProgressChecklist()}
              </div>
            ) : (
              <div>
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <p className="text-[#115054] font-medium">Analysis job in progress...</p>
                </div>
                <p className="text-[#525252]">
                  {streamedJson || 'Your analysis is being processed. This may take several minutes for large datasets.'}
                </p>
              </div>
            )}
            <div className="flex justify-center">
              <div className="flex flex-col max-w-2xl w-full px-4">
            <div className="mt-4 bg-[#fafafa] rounded-lg p-4 text-sm text-[#525252]">
              <p className="mb-2 text-[#525252] font-medium">Why is this taking time?</p>
              <p>
                Sentiment analysis involves multiple complex steps including data collection, 
                AI processing, and result merging. You can continue using other parts of the 
                application while waiting - your results will be displayed as soon as they're ready.
              </p>
            </div>
            
            <div className="mt-4 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4 text-sm">
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
            </div>
            </div>
          </div>
        ) : (
          <p className="text-[#525252]">
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
      return <p className="text-[#525252]">No sentiment analysis results available yet. Click "Analyze" to begin.</p>;
    }

    // Get filtered data based on date range
    const filteredData = getFilteredAnalysisData();
    
    // Return early if no filtered data is available
    if (!filteredData) {
      return <p className="text-[#525252]">No data available for the selected date range.</p>;
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
          <div className="p-4 rounded-lg border border-[#e5e5e5] bg-white mb-6">
            <h2 className="text-xl font-bold text-[#115054] mb-4 flex items-center">
              <span className="mr-2">🔍</span> Sentiment Analysis
            </h2>
            <p className="text-[#525252] mb-4">
              Below is a summary of the sentiment analysis results, organized by category.
              Each point shows its frequency in the analyzed data. Click on any category to see detailed analysis.
            </p>
            
            {/* Feedback Categories Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Positive Categories */}
              <div>
                <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center">
                  <span className="mr-2">✓</span> Positive Feedback
                </h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-custom">
                  {positiveCategories.map((category, index) => (
                    <div
                      key={`pos-${index}`}
                      className="p-4 rounded-lg border border-[#e5e5e5] hover:border-green-500 transition-colors cursor-pointer bg-[#fafafa]"
                      onClick={() => handleCategoryClick('positive', index)}
                    >
                      <h4 className="text-lg font-medium text-green-600 mb-3 border-b border-[#e5e5e5] pb-2 flex items-center justify-between">
                        {category.category}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-green-600"
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
                              <span className="text-[#525252] group-hover:text-[#141414] transition-colors">{point.point}</span>
                            </div>
                            <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full flex-shrink-0">
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
                <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center">
                  <span className="mr-2">⚠</span> Negative Feedback
                </h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-custom">
                  {negativeCategories.map((category, index) => (
                    <div
                      key={`neg-${index}`}
                      className="p-4 rounded-lg border border-[#e5e5e5] hover:border-red-500 transition-colors cursor-pointer bg-[#fafafa]"
                      onClick={() => handleCategoryClick('negative', index)}
                    >
                      <h4 className="text-lg font-medium text-red-600 mb-3 border-b border-[#e5e5e5] pb-2 flex items-center justify-between">
                        {category.category}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-red-600"
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
                              <span className="text-[#525252] group-hover:text-[#141414] transition-colors">{point.point}</span>
                            </div>
                            <span className="ml-3 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full flex-shrink-0">
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
    <div className="p-6 rounded-xl shadow-xl border border-[#e5e5e5] min-h-screen scrollbar-custom" style={{ backgroundColor: '#ffffff' }}>
      {/* Tab Navigation with Date Picker */}
      <div className="flex justify-between mb-6 border-b border-[#e5e5e5] pb-2">
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
                  ? 'bg-[#115054] text-white'
                  : 'text-[#115054] hover:bg-[#f5f5f5]'
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
            <span className="flex items-center text-sm text-[#525252] bg-[#fafafa] border border-[#e5e5e5] px-4 py-2 rounded ml-3 whitespace-nowrap">
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
                    <div key={post.id} className="p-6 rounded-lg border border-[#e5e5e5]" style={{ backgroundColor: '#fafafa' }}>
                      <h3 className="text-sm font-semibold text-blue-400 mb-2">Post {post.id}</h3>
                      
                      {/* Post Header */}
                      <div className="mb-4">
                        <h4 className="text-lg font-medium text-[#141414]">{post.title}</h4>
                        <div className="flex gap-3 text-xs text-[#525252] mt-1">
                          <span>Score: {post.score}</span>
                          <span>Posted: {post.created_utc}</span>
                        </div>
                      </div>

                      {/* Post Content */}
                      {post.selftext && (
                        <p className="text-[#525252] mb-4">{post.selftext}</p>
                      )}

                      {/* Comments Section */}
                      <div className="space-y-4 mt-4 border-t border-[#e5e5e5] pt-4">
                        {post.comments?.map((comment: Comment, index: number) => (
                          <div key={index} className="pl-4 border-l-2 border-[#e5e5e5]">
                            <div className="text-[#525252]">{comment.body}</div>
                            <div className="flex gap-3 text-xs text-[#525252] mt-1">
                              <span>Score: {comment.score}</span>
                              <span>Posted: {comment.created_utc}</span>
                            </div>
                            
                            {/* Nested Replies */}
                            {comment.replies?.map((reply: Comment, replyIndex: number) => (
                              <div key={replyIndex} className="ml-4 mt-2 pl-4 border-l-2 border-[#e5e5e5]">
                                <div className="text-[#525252]">{reply.body}</div>
                                <div className="flex gap-3 text-xs text-[#525252] mt-1">
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
            <p className="text-[#525252]">No sentiment analysis results available yet. Click "Analyze" to begin.</p>
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
            <p className="text-[#525252]">No sentiment analysis results available yet. Click "Analyze" to begin.</p>
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
            <p className="text-[#525252]">No sentiment analysis results available yet. Click "Analyze" to begin.</p>
          )
        )}
      </div>
    </div>
  );
}; 