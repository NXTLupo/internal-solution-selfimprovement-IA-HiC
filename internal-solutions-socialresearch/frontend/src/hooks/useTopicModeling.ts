import { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeTopicsAsync, getJobStatus, cancelJob, cancelJobsByProject, getJobsByProject } from '../services/topicService';
import { AnalysisFormData } from '../types/TopicModeling';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './useUser';
import { 
  setTopicData, 
  setTopicProject, 
  setTopicLoading, 
  setTopicError 
} from '../store/topicSlice';

export const useTopicModeling = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { deleteProject, fetchProject } = useUser();
  
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
  
  // Use refs for the interval and active polling flag
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingActiveRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    isPollingActiveRef.current = false;
  }, []);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Clean up the interval when the component unmounts
  useEffect(() => {
    return () => {
      clearPollInterval();
    };
  }, [clearPollInterval]);

  // Clean up polling when navigating away from topic modeling pages
  useEffect(() => {
    const isTopicModelingPage = location.pathname.includes('/topic-modeling');
    
    if (!isTopicModelingPage) {
      // Immediately stop any active polling
      clearPollInterval();
      
      // Clear all job-related state
      setJobId(undefined);
      setJobStatus(undefined);
      setJobProgress(null);
      setJobMessage(undefined);
      
      // Clear loading state if we're leaving the page
      if (loading) {
        dispatch(setTopicLoading(false));
      }
    }
    
    // Cleanup function when location changes
    return () => {
      if (!location.pathname.includes('/topic-modeling')) {
        clearPollInterval();
      }
    };
  }, [location.pathname, clearPollInterval, loading, dispatch]);

  // Clean up polling when project ID changes (switching between projects)
  useEffect(() => {
    return () => {
      // Clear polling when project ID changes
      clearPollInterval();
      setJobId(undefined);
      setJobStatus(undefined);
      setJobProgress(null);
      setJobMessage(undefined);
    };
  }, [projectId, clearPollInterval]);

  // Function to clear all job-related state
  const clearJobState = useCallback(() => {
    clearPollInterval();
    setJobId(undefined);
    setJobStatus(undefined);
    setJobProgress(null);
    setJobMessage(undefined);
    dispatch(setTopicLoading(false));
    dispatch(setTopicError(null));
  }, [clearPollInterval, dispatch]);

  // Function to load a project and handle job status if it's processing
  const loadProjectWithJobStatus = useCallback(async (projectId: string) => {
    try {
      // Clear any existing job state first
      clearJobState();
      
      const project = await fetchProject(projectId);
      
      // Check if the project has job status information
      if (project && project.job_status) {
        const { job_status } = project;
        
        // If the job is still processing, start polling
        if (job_status.status === 'processing' || job_status.status === 'pending') {
          // Set the job tracking states
          setJobId(job_status.job_id);
          setJobStatus(job_status.status);
          setJobProgress(job_status.progress || null);
          setJobMessage(job_status.message || 'Processing...');
          
          // Set loading state
          dispatch(setTopicLoading(true));
          dispatch(setTopicError(null));
          
          // Update Redux with the project ID (even if data is empty)
          dispatch(setTopicProject({
            id: projectId,
            data: null
          }));
          
          // Start polling the job status
          isPollingActiveRef.current = true;
          
          const interval = setInterval(async () => {
            // Check if component is still mounted and polling is active
            if (!isMountedRef.current || !isPollingActiveRef.current) {
              clearPollInterval();
              return;
            }

            // Double-check we're still on a topic modeling page
            if (!window.location.pathname.includes('/topic-modeling')) {
              clearPollInterval();
              return;
            }

            try {
              const statusData = await getJobStatus(job_status.job_id);
              
              // Only update state if component is still mounted
              if (!isMountedRef.current || !isPollingActiveRef.current) {
                return;
              }
              
              setJobStatus(statusData.status);
              setJobProgress(statusData.progress || null);
              setJobMessage(statusData.message || '');
              
              // If job is completed, stop polling and update the topic data
              if (statusData.status === 'completed') {
                clearPollInterval();
                
                if (statusData.result && isMountedRef.current) {
                  // Update Redux with the completed data
                  dispatch(setTopicProject({
                    id: projectId,
                    data: statusData.result
                  }));
                }
                
                dispatch(setTopicLoading(false));
                return;
              } 
              // If job failed, stop polling and set the error
              else if (statusData.status === 'failed') {
                clearPollInterval();
                if (isMountedRef.current) {
                  dispatch(setTopicError(statusData.error || 'Job failed'));
                  dispatch(setTopicLoading(false));
                }
                return;
              }
              // If job was cancelled, stop polling
              else if (statusData.status === 'cancelled') {
                clearPollInterval();
                if (isMountedRef.current) {
                  dispatch(setTopicLoading(false));
                }
                return;
              }
            } catch (error) {
              console.error('Error polling job status:', error);
              clearPollInterval();
            }
          }, 30000); // Poll every 30 seconds
          
          pollIntervalRef.current = interval;
          
        } else if (job_status.status === 'completed') {
          // Job was completed, project should have data
          if (project.data && Object.keys(project.data).length > 0) {
            dispatch(setTopicProject({
              id: projectId,
              data: project.data
            }));
          }
        } else if (job_status.status === 'failed') {
          // Job failed
          dispatch(setTopicError(job_status.error || 'Previous job failed'));
        }
      } else if (project && project.data && Object.keys(project.data).length > 0) {
        // Project has data and no active job, load normally
        dispatch(setTopicProject({
          id: projectId,
          data: project.data
        }));
      } else {
        // Project exists but has no data and no job information
        dispatch(setTopicProject({
          id: projectId,
          data: null
        }));
      }
      
      return project;
    } catch (error) {
      console.error('Error loading project with job status:', error);
      throw error;
    }
  }, [fetchProject, dispatch, clearPollInterval, clearJobState]);

  // Main function to analyze subreddit topics (asynchronous only)
  const analyzeSubredditTopics = useCallback(async (formData: AnalysisFormData) => {
    // Clear any existing job state first
    clearJobState();
    
    dispatch(setTopicLoading(true));
    dispatch(setTopicError(null));
    
    try {
      // Use project ID from Redux if available and not provided in form data
      const projectIdToUse = formData.project_id || projectId || undefined;
      
      // Start the asynchronous job
      const jobData = await analyzeTopicsAsync({
        subreddit: formData.subreddit,
        sort: formData.sort,
        user_id: '123', // Use default user ID for now
        project_id: projectIdToUse,
        keyword: formData.keyword, // Pass the keyword parameter
        startDate: formData.startDate,
        endDate: formData.endDate
      });
      
      // Set the job ID and initial status
      setJobId(jobData.job_id);
      setJobStatus(jobData.status);
      setJobMessage(jobData.message);
      
      isPollingActiveRef.current = true;
      
      // Start polling for job status
      const interval = setInterval(async () => {
        // Check if component is still mounted and polling is active
        if (!isMountedRef.current || !isPollingActiveRef.current) {
          clearPollInterval();
          return;
        }

        // Double-check we're still on a topic modeling page
        if (!window.location.pathname.includes('/topic-modeling')) {
          clearPollInterval();
          return;
        }

        try {
          const statusData = await getJobStatus(jobData.job_id);
          
          // Only update state if component is still mounted and polling is active
          if (!isMountedRef.current || !isPollingActiveRef.current) {
            return;
          }
          
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
            clearPollInterval();
            
            if (statusData.result && isMountedRef.current) {
              // Preserve date range from the form data in the results
              const resultWithDates = {
                ...statusData.result,
                startDate: formData.startDate,
                endDate: formData.endDate
              };
              
              // If we have a project ID, store both the ID and data
              if (projectIdToUse) {
                dispatch(setTopicProject({
                  id: projectIdToUse,
                  data: resultWithDates
                }));
              } else if (statusData.analysis_id) {
                // If we got an analysis ID from the job
                dispatch(setTopicProject({
                  id: statusData.analysis_id,
                  data: resultWithDates
                }));
              } else {
                // Otherwise just update the data
                dispatch(setTopicData(resultWithDates));
              }
            }
            
            if (isMountedRef.current) {
              dispatch(setTopicLoading(false));
            }
            return;
          } 
          // If job failed, stop polling and set the error
          else if (statusData.status === 'failed') {
            clearPollInterval();
            if (isMountedRef.current) {
              dispatch(setTopicError(statusData.error || 'Job failed'));
              dispatch(setTopicLoading(false));
            }
            return;
          }
          // If job was cancelled, stop polling
          else if (statusData.status === 'cancelled') {
            clearPollInterval();
            if (isMountedRef.current) {
              dispatch(setTopicLoading(false));
            }
            return;
          }
          
        } catch (pollError) {
          console.error('Error polling job status:', pollError);
          // Stop polling on error
          clearPollInterval();
          if (isMountedRef.current) {
            dispatch(setTopicError('Error checking job status'));
            dispatch(setTopicLoading(false));
          }
        }
      }, 30000); // Poll every 30 seconds
      
      // Store the interval reference
      pollIntervalRef.current = interval;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      if (isMountedRef.current) {
        dispatch(setTopicError(errorMessage));
        dispatch(setTopicLoading(false));
      }
      console.error('Error starting topic analysis job:', err);
    }
  }, [dispatch, projectId, clearPollInterval, clearJobState]);

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

  // Function to cancel all jobs for the current project, delete the project, and navigate to landing page
  const cancelCurrentProject = useCallback(async () => {
    if (projectId) {
      try {
        // First cancel all jobs for the project
        const result = await cancelJobsByProject(projectId);
        setJobStatus('cancelled');
        setJobMessage(`Project cancelled: ${result.message}`);
        clearPollInterval();
        dispatch(setTopicLoading(false));
        
        // Always delete the project when cancelling
        await deleteProject(projectId);
        
        // Always navigate to landing page when cancelling
        navigate('/');
        
        return result;
      } catch (err) {
        console.error('Error cancelling project jobs:', err);
        throw err;
      }
    } else {
      throw new Error('No project ID available for cancellation');
    }
  }, [projectId, clearPollInterval, dispatch, deleteProject, navigate]);

  // Function to get all jobs for the current project
  const getProjectJobs = useCallback(async () => {
    if (projectId) {
      try {
        const result = await getJobsByProject(projectId);
        return result;
      } catch (err) {
        console.error('Error getting project jobs:', err);
        throw err;
      }
    } else {
      throw new Error('No project ID available');
    }
  }, [projectId]);

  return {
    loading,
    topicData,
    projectId,
    error,
    // Main method (async only)
    analyzeSubredditTopics,
    // Job control and status
    cancelCurrentJob,
    cancelCurrentProject,
    getProjectJobs,
    jobId,
    jobStatus,
    jobProgress,
    jobMessage,
    // New function
    loadProjectWithJobStatus,
    clearJobState
  };
}; 