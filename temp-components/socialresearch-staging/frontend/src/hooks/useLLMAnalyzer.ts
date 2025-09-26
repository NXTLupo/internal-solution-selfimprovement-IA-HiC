import { useState, useEffect, useRef } from 'react';
import { analyzeSubreddit, analyzeSentiment, getSentimentJobStatus, SearchParams as ApiSearchParams, regenerateAISummary, getAISummaryByProjectId } from '../services/llmAnalyzer';
import { AnalysisState, AnalysisFormData, AnalysisData } from '../types/analysis';
import { useDispatch, useSelector } from 'react-redux';
import { setAISummary, setAISummaryLoading, setAISummaryError } from '../store/sentimentAnalysisSlice';
import { RootState } from '../store/store';

export const useRedditAnalysis = () => {
  const dispatch = useDispatch();
  const projectId = useSelector((state: RootState) => state.sentimentAnalysis.projectId);

  const [state, setState] = useState<AnalysisState>({
    analysis: null,
    loading: false,
    error: null,
    rawResponse: null,
    streamedReasoning: '',
    streamedJson: '',
    isThinking: false
  });
  
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const pollingInterval = useRef<number | null>(null);
  const pollingAttempts = useRef<number>(0);

  // Fixed polling interval of 30 seconds (30,000 ms)
  const POLLING_INTERVAL = 30000;

  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, []);

  // Function to refresh AI summary
  const refreshAISummary = async (analysisResult: AnalysisData) => {
    try {
      console.log("[useLLMAnalyzer] Auto-refreshing AI summary after job completion");
      
      // Use the projectId from the result or from the Redux store
      const effectiveProjectId = analysisResult?.analysis_id || projectId;
      
      if (!effectiveProjectId) {
        console.error("[useLLMAnalyzer] Cannot refresh AI summary: No project ID available");
        return;
      }
      dispatch(setAISummaryLoading(true));
      
      // Check if we have the analysis data available
      if (analysisResult?.merged_result) {
        console.log("[useLLMAnalyzer] Regenerating AI summary with analysis data");
        const regeneratedSummary = await regenerateAISummary(analysisResult.merged_result, effectiveProjectId);
        dispatch(setAISummary(regeneratedSummary));
      } else {
        console.log("[useLLMAnalyzer] Fetching existing AI summary for project");
        const summary = await getAISummaryByProjectId(effectiveProjectId);
        dispatch(setAISummary(summary));
      }
      
      // Set loading state to false when refresh is complete
      dispatch(setAISummaryLoading(false));
    } catch (err) {
      console.error("[useLLMAnalyzer] Error refreshing AI summary:", err);
      dispatch(setAISummaryError('Failed to refresh AI summary'));
      dispatch(setAISummaryLoading(false));
    }
  };

  // Poll for job status
  const pollJobStatus = async (jobId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    // Reset polling attempts counter
    pollingAttempts.current = 0;

    const checkStatus = async () => {
      try {
        // Increment attempt counter
        pollingAttempts.current += 1;        
        const statusResponse = await getSentimentJobStatus(jobId);
        
        console.log(`Job status check (attempt ${pollingAttempts.current}):`, statusResponse);
        
        if (statusResponse.status === 'completed' && statusResponse.result) {
          // Job completed successfully
          setState(prev => ({ 
            ...prev, 
            rawResponse: statusResponse.result,
            analysis: statusResponse.result,
            loading: false,
            isThinking: false
          }));
          
          // Stop polling
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
          
          setCurrentJobId(null);
          
          // Automatically refresh the AI summary
          await refreshAISummary(statusResponse.result);
        } 
        else if (statusResponse.status === 'failed') {
          // Job failed
          setState(prev => ({ 
            ...prev, 
            error: statusResponse.error || 'Analysis job failed',
            loading: false,
            isThinking: false
          }));
          
          // Stop polling
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
          
          setCurrentJobId(null);
        }
        else if (statusResponse.status === 'processing') {
          // Update UI to show processing status and progress if available
          setState(prev => ({
            ...prev,
            streamedJson: statusResponse.message || 'Processing analysis...',
            isThinking: true
          }));
          
          // If there's a progress indicator, update it
          if (statusResponse.progress !== undefined) {
            setState(prev => ({
              ...prev,
              streamedJson: `Processing analysis... ${statusResponse.progress}% complete`
            }));
          }
        }
        // For 'pending' status, just continue polling
      } catch (err: unknown) {
        console.error("Error polling job status:", err);
        
        // Don't stop polling on network errors, we'll try again
        console.log('Continuing to poll despite error');
      }
    };

    // Check immediately then set up interval
    await checkStatus();
    pollingInterval.current = setInterval(checkStatus, POLLING_INTERVAL); // Poll every 30 seconds
    console.log(`[pollJobStatus] Started polling with 30 second interval`);
  };

  const handleAnalyze = async (formData: AnalysisFormData, projectId?: string) => {
    const { 
      subreddit, 
      applicationName, 
      postLimit, 
      sort, 
      timeFilter,
      filterType,
      keyword,
      mergeMethod,
      chunkSize,
      analysisModel,
      maxWorkers
    } = formData;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      streamedReasoning: '',
      streamedJson: '',
      isThinking: true,
      analysis: null
    }));
    
    try {
      // Step 1: Search Reddit, this won't take more than 4 mins
      const searchParams: ApiSearchParams = {
        subreddit,
        query: applicationName,
        limit: postLimit,
        sort,
        time: timeFilter
      };
      
      const analysisResponse = await analyzeSubreddit(searchParams);
      // Step 2: Start async sentiment analysis      
      const jobResponse = await analyzeSentiment(
        analysisResponse.search_id,
        applicationName,
        {
          filterType,
          keyword,
          mergeMethod,
          chunkSize,
          model: analysisModel,
          maxWorkers,
          projectId
        },
      );
      
      // Store job ID and start polling
      setCurrentJobId(jobResponse.job_id);
      console.log('Received job ID:', jobResponse.job_id);
      
      // Begin polling for job status
      pollJobStatus(jobResponse.job_id);
      
    } catch (err: unknown) {
      console.error("Error during analysis:", err);
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : "An error occurred during analysis",
        loading: false,
        isThinking: false
      }));
    }
  };

  const cancelAnalysis = async () => {
    if (currentJobId) {
      try {
        console.log('Cancelling job:', currentJobId);
        
        // Stop polling
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        
        setState(prev => ({
          ...prev,
          loading: false,
          isThinking: false
        }));
        
        setCurrentJobId(null);
      } catch (err) {
        console.error('Error cancelling job:', err);
      }
    }
  };

  return {
    ...state,
    handleAnalyze,
    cancelAnalysis,
    clearError: () => setState(prev => ({ ...prev, error: null })),
    isPolling: !!currentJobId
  };
}; 