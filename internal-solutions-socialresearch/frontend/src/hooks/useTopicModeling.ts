import { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeTopicsAsync, getJobStatus, cancelJob } from '../services/topicService';
import { AnalysisFormData } from '../types/TopicModeling';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  setTopicData, 
  setTopicProject, 
  setTopicLoading, 
  setTopicError 
} from '../store/topicSlice';

export const useTopicModeling = () => {
  const dispatch = useAppDispatch();
  
  // Get topicData and projectId from Redux
  const topicData = useAppSelector(state => state.topic.topicData);
  const projectId = useAppSelector(state => state.topic.projectId);
  const loading = useAppSelector(state => state.topic.loading);
  const error = useAppSelector(state => state.topic.error);

  // Add states for job tracking
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [jobStatus, setJobStatus] = useState<string | undefined>(undefined);
  const [jobProgress, setJobProgress] = useState<number | null>(null);
  const [jobMessage, setJobMessage] = useState<string | undefined>(undefined);
  
  // Use a ref for the interval to ensure it persists across renders
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearPollInterval = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Clean up the interval when the component unmounts
  useEffect(() => {
    return () => {
      clearPollInterval();
    };
  }, [clearPollInterval]);

  // Main function to analyze subreddit topics (asynchronous only)
  const analyzeSubredditTopics = useCallback(async (formData: AnalysisFormData) => {
    // Clear any existing polling interval
    clearPollInterval();
    
    // Reset job-related states
    setJobId(undefined);
    setJobStatus(undefined);
    setJobProgress(null);
    setJobMessage(undefined);
    
    dispatch(setTopicLoading(true));
    dispatch(setTopicError(null));
    
    try {
      // Use project ID from Redux if available and not provided in form data
      const projectIdToUse = formData.project_id || projectId || undefined;
      
      // Log the project ID being used
      console.log("analyzeSubredditTopics using projectId:", projectIdToUse);
      
      // Start the asynchronous job
      const jobData = await analyzeTopicsAsync({
        subreddit: formData.subreddit,
        sort: formData.sort,
        user_id: '123', // Use default user ID for now
        project_id: projectIdToUse,
        keyword: formData.keyword // Pass the keyword parameter
      });
      
      // Set the job ID and initial status
      setJobId(jobData.job_id);
      setJobStatus(jobData.status);
      setJobMessage(jobData.message);
      
      let shouldContinuePolling = true;
      
      // Start polling for job status
      const interval = setInterval(async () => {
        try {
          // Don't proceed if we've marked polling as done
          if (!shouldContinuePolling || !jobData?.job_id) {
            console.log("Polling stopped because shouldContinuePolling=", shouldContinuePolling);
            clearPollInterval();
            return;
          }
          
          const statusData = await getJobStatus(jobData.job_id);
          console.log(`Job status update: ${statusData.status}, progress: ${statusData.progress}`);
          
          // Update job state
          setJobStatus(statusData.status);
          if (statusData.progress !== undefined) {
            setJobProgress(statusData.progress);
          }
          if (statusData.message) {
            setJobMessage(statusData.message);
          }
          
          // If job is completed, stop polling and update the topic data
          if (statusData.status === 'completed') {
            console.log("Job completed, stopping polling");
            shouldContinuePolling = false;
            clearPollInterval();
            
            if (statusData.result) {
              // If we have a project ID, store both the ID and data
              if (projectIdToUse) {
                dispatch(setTopicProject({
                  id: projectIdToUse,
                  data: statusData.result
                }));
              } else if (statusData.analysis_id) {
                // If we got an analysis ID from the job
                dispatch(setTopicProject({
                  id: statusData.analysis_id,
                  data: statusData.result
                }));
              } else {
                // Otherwise just update the data
                dispatch(setTopicData(statusData.result));
              }
            }
            
            dispatch(setTopicLoading(false));
            return;
          } 
          // If job failed, stop polling and set the error
          else if (statusData.status === 'failed') {
            console.log("Job failed, stopping polling");
            shouldContinuePolling = false;
            clearPollInterval();
            dispatch(setTopicError(statusData.error || 'Job failed'));
            dispatch(setTopicLoading(false));
            return;
          }
          // If job was cancelled, stop polling
          else if (statusData.status === 'cancelled') {
            console.log("Job cancelled, stopping polling");
            shouldContinuePolling = false;
            clearPollInterval();
            dispatch(setTopicLoading(false));
            return;
          }
          
        } catch (pollError) {
          console.error('Error polling job status:', pollError);
          // Stop polling on error
          shouldContinuePolling = false;
          clearPollInterval();
          dispatch(setTopicError('Error checking job status'));
          dispatch(setTopicLoading(false));
        }
      }, 30000); // Poll every 30 seconds
      
      // Store the interval reference
      pollIntervalRef.current = interval;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch(setTopicError(errorMessage));
      console.error('Error starting topic analysis job:', err);
      dispatch(setTopicLoading(false));
    }
  }, [dispatch, projectId, clearPollInterval]);

  // Function to cancel the current job
  const cancelCurrentJob = useCallback(async () => {
    if (jobId) {
      try {
        const result = await cancelJob(jobId);
        setJobStatus(result.status);
        setJobMessage(result.message);
        clearPollInterval();
        dispatch(setTopicLoading(false));
      } catch (err) {
        console.error('Error cancelling job:', err);
      }
    }
  }, [jobId, clearPollInterval, dispatch]);

  return {
    loading,
    topicData,
    projectId,
    error,
    // Main method (async only)
    analyzeSubredditTopics,
    // Job control and status
    cancelCurrentJob,
    jobId,
    jobStatus,
    jobProgress,
    jobMessage
  };
}; 