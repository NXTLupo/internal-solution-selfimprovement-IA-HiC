import { useEffect, useState, useCallback } from 'react';
import { AISummaryResponse, regenerateAISummary } from '../../../services/llmAnalyzer';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { getAISummaryByProjectId } from '../../../services/llmAnalyzer';
import { AISummaryBoxProps, Category, Point, Post } from '../../../types/analysis';

export const AISummaryBox = ({ 
  analysisData, 
  isPlaceholder = false,
  aiSummary: externalAiSummary,
  loading: externalLoading,
  error: externalError,
  skipFetch = false,
  dateRange,
  analysis,
  onRefresh
}: AISummaryBoxProps) => {
  // Use external state if provided, otherwise manage locally
  const [loading, setLoading] = useState(externalLoading !== undefined ? externalLoading : true);
  const [aiSummary, setAiSummary] = useState<AISummaryResponse | null>(externalAiSummary || null);
  const [error, setError] = useState<string | null>(externalError || null);

  // Get project ID from Redux
  const projectId = useSelector((state: RootState) => state.sentimentAnalysis.projectId);
  
  // LLM provider selection for Ask AI summary
  const [llmProvider, setLlmProvider] = useState<'openai' | 'claude' | 'gemini'>('claude');
  
  // Update local state when external state changes
  useEffect(() => {
    if (externalAiSummary !== undefined) {
      setAiSummary(externalAiSummary);
    }
    if (externalLoading !== undefined) setLoading(externalLoading);
    if (externalError !== undefined) setError(externalError);
  }, [externalAiSummary, externalLoading, externalError]);

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
      if (postDate < fromDate) return false;
    }

    let toDate = null;
    if (dateRange.toYear && dateRange.toMonth) {
      toDate = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth) - 1, 1);
      // Set to end of month
      toDate.setMonth(toDate.getMonth() + 1);
      toDate.setDate(0);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (postDate > toDate) return false;
    }

    return true;
  }, [dateRange, getDateFromTimestamp]);

  // Filter analysis data by date range
  const getFilteredAnalysisData = useCallback(() => {
    if (!analysisData || !dateRange || !analysis?.formatted_data?.results) {
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
  }, [analysisData, dateRange, analysis, isWithinDateRange]);
  
  // Update the fetchSummary function to use useCallback
  const fetchSummary = useCallback(async () => {
    if (!projectId) {
      setError('No project ID available to fetch summary');
      return;
    }
    
    try {
      setLoading(true);
      
      // If we have analysis data, regenerate the summary with the LLM using filtered data
      if (analysisData) {
        const filteredData = getFilteredAnalysisData();
        // Ensure filteredData is not undefined before calling API
        if (filteredData) {
          const regeneratedSummary = await regenerateAISummary(filteredData, projectId, llmProvider);
          setAiSummary(regeneratedSummary);
        } else {
          throw new Error('Unable to filter analysis data');
        }
      } else {
        // Fallback to just fetching the existing summary
        const summaryData = await getAISummaryByProjectId(projectId, llmProvider);
        setAiSummary(summaryData);
      }
      
      setError(null);
      
      // Call the onRefresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error fetching AI summary:', err);
      setError('Failed to generate AI summary. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [projectId, analysisData, getFilteredAnalysisData, onRefresh, llmProvider]);
  
  // Add useEffect to call fetchSummary
  useEffect(() => {
    if (projectId && !skipFetch && !externalAiSummary) {
      fetchSummary();
    }
  }, [projectId, skipFetch, externalAiSummary, fetchSummary]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchSummary();
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-blue-400 flex items-center">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          AI-Powered Summary
        </h3>
        
        <div className="flex items-center space-x-2">
          <select
            className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none"
            value={llmProvider}
            onChange={(e) => setLlmProvider(e.target.value as 'openai' | 'claude' | 'gemini')}
            title="Select AI model"
          >
            <option value="openai">GPT-4o</option>
            <option value="claude">Claude 3.7 Sonnet</option>
            <option value="gemini">Gemini 2.5 Pro</option>
          </select>
          {/* Refresh button */}
          {!isPlaceholder && projectId && (
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className={`flex items-center px-3 py-1 rounded text-sm ${
                loading 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
              }`}
            >
              <svg 
                className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="mt-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      ) : error ? (
        <div className="text-red-400">
          {error}
        </div>
      ) : isPlaceholder ? (
        <div className="text-yellow-400">
          Waiting for AI summary data... (Placeholder)
        </div>
      ) : !aiSummary ? (
        <div className="space-y-2">
          <div className="text-yellow-400">
            Waiting for AI summary data...
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-300">
            {aiSummary.summary || "No summary available"}
          </p>
          
          <div className="mt-2 space-y-2">
            <h4 className="text-sm font-semibold text-gray-400">Key Insights:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li className="text-gray-300 text-sm">
                <span className="text-green-400 font-medium">Top positive</span>: {aiSummary.topPositive || "No positive insights found"}
              </li>
              <li className="text-gray-300 text-sm">
                <span className="text-red-400 font-medium">Main concerns</span>: {aiSummary.topNegative || "No concerns found"}
              </li>
            </ul>
          </div>
          
          <div className="mt-2 space-y-2">
            <h4 className="text-sm font-semibold text-gray-400">Recommendations:</h4>
            <ul className="list-disc list-inside space-y-1">
              {aiSummary.recommendations && Array.isArray(aiSummary.recommendations) ? (
                aiSummary.recommendations.map((recommendation: string, index: number) => (
                  <li key={index} className="text-gray-300 text-sm">
                    {recommendation}
                  </li>
                ))
              ) : (
                <li className="text-gray-300 text-sm">No recommendations available</li>
              )}
            </ul>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500 flex items-center">
        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {isPlaceholder ? 
          "This is a placeholder. Actual implementation would provide custom insights based on your specific data." :
          (llmProvider === 'openai' ? 'Powered by GPT-4o' : llmProvider === 'gemini' ? 'Powered by Gemini 2.5 Pro' : 'Powered by Claude 3.7 Sonnet')
        }
      </div>
    </div>
  );
}; 
