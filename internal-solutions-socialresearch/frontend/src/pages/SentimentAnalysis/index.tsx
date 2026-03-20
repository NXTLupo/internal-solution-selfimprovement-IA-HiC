import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnalysisForm } from './AnalysisForm';
import { AnalysisResults } from './AnalysisResults';
import { useRedditAnalysis } from '../../hooks/useLLMAnalyzer';
import { useUser } from '../../hooks/useUser';
import { AnalysisFormData, Category, Point, AnalysisData } from '../../types/analysis';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setFormData, setAnalysisData, resetFormValues, clearAnalysisData, setProjectId } from '../../store/sentimentAnalysisSlice';
import { AISummaryResponse } from '../../services/llmAnalyzer';
import { userService } from '../../services/user';

// Define a custom interface that extends the existing AnalysisData and includes ai_summary
interface ExtendedAnalysisData extends AnalysisData {
  ai_summary?: AISummaryResponse;
}

// Update this function to handle exporting filtered data and include subreddit/topic
const exportToMarkdown = (
  analysis: ExtendedAnalysisData,
  filteredData: ExtendedAnalysisData | null,
  projectId: string | undefined,
  subreddit: string,
  applicationName: string
) => {
  // Use filtered data if available, otherwise use the original analysis
  const dataToExport = filteredData || analysis;
  if (!dataToExport) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sentiment-analysis-${subreddit || 'reddit'}-${applicationName || 'topic'}-${projectId || 'export'}-${timestamp}.md`;
  
  // Create markdown content with dynamic title
  let markdownContent = `# Sentiment Analysis Report: r/${subreddit}`;
  if (applicationName) {
    markdownContent += ` - ${applicationName}`;
  }
  markdownContent += `\n\n`;
  
  if (dataToExport.ai_summary) {
    markdownContent += `## AI Summary\n\n${dataToExport.ai_summary.summary}\n\n`;
    markdownContent += `### Top Positive Feedback\n\n${dataToExport.ai_summary.topPositive}\n\n`;
    markdownContent += `### Top Negative Feedback\n\n${dataToExport.ai_summary.topNegative}\n\n`;
    
    markdownContent += `### Recommendations\n\n`;
    dataToExport.ai_summary.recommendations.forEach((rec: string, index: number) => {
      markdownContent += `${index + 1}. ${rec}\n`;
    });
    markdownContent += `\n\n`;
  }
  
  // Add analysis data
  if (dataToExport.merged_result) {
    markdownContent += `## Detailed Analysis\n\n`;
    
    // Positive feedback
    markdownContent += `### Positive Feedback\n\n`;
    dataToExport.merged_result.positive.forEach((category: Category) => {
      markdownContent += `#### ${category.category}\n\n`;
      category.points.forEach((point: Point) => {
        // Add the main point
        markdownContent += `- ${point.point} (${point.frequency} mentions)\n`;
        // Add the evidence snippets if they exist
        if (point.evidence && typeof point.evidence === 'object') {
          Object.values(point.evidence).forEach((evidenceText: string[]) => {
            // Format evidence as a blockquote or nested item
            if (Array.isArray(evidenceText)) {
              evidenceText.forEach(text => {
                markdownContent += `  > ${text}\n`;
              });
            } else {
              markdownContent += `  > ${evidenceText}\n`; // Using blockquote for evidence
            }
          });
        }
      });
      markdownContent += `\n`;
    });
    
    // Negative feedback
    markdownContent += `### Negative Feedback\n\n`;
    dataToExport.merged_result.negative.forEach((category: Category) => {
      markdownContent += `#### ${category.category}\n\n`;
      category.points.forEach((point: Point) => {
        // Add the main point
        markdownContent += `- ${point.point} (${point.frequency} mentions)\n`;
        // Add the evidence snippets if they exist
        if (point.evidence && typeof point.evidence === 'object') {
          Object.values(point.evidence).forEach((evidenceText: string[]) => {
            // Format evidence as a blockquote or nested item
            if (Array.isArray(evidenceText)) {
              evidenceText.forEach(text => {
                markdownContent += `  > ${text}\n`;
              });
            } else {
              markdownContent += `  > ${evidenceText}\n`; // Using blockquote for evidence
            }
          });
        }
      });
      markdownContent += `\n`;
    });
  }
  
  // Create a blob and download
  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function SentimentAnalysis() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { projectId } = useParams<{ projectId: string }>();
  
  // Get data from Redux store
  const reduxFormData = useSelector((state: RootState) => state.sentimentAnalysis);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const userProjects = useSelector((state: RootState) => state.user.currentUser?.projects || []);
  const dateFilteredData = useSelector((state: RootState) => state.sentimentAnalysis.dateFilteredData) as ExtendedAnalysisData | null;
  
  const {
    analysis,
    loading,
    error,
    rawResponse,
    streamedReasoning,
    streamedJson,
    isThinking,
    handleAnalyze,
    clearError,
    isPolling
  } = useRedditAnalysis();
  
  const { fetchUserProjects, loading: userLoading, error: userError } = useUser();

  // Add local validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  const validMaxWorkers = (typeof reduxFormData.maxWorkers === 'number' && reduxFormData.maxWorkers >= 1 && reduxFormData.maxWorkers <= 8)
    ? reduxFormData.maxWorkers
    : 3;
  const [formData, setLocalFormData] = useState<AnalysisFormData>({
    subreddit: reduxFormData.subreddit || '',
    applicationName: reduxFormData.applicationName || '',
    postLimit: reduxFormData.postLimit || 800,
    sort: reduxFormData.sort || 'relevance',
    timeFilter: reduxFormData.timeFilter || 'all',
    filterType: reduxFormData.filterType || 'cluster',
    keyword: reduxFormData.keyword || '',
    mergeMethod: reduxFormData.mergeMethod || 'deepseek',
    chunkSize: reduxFormData.chunkSize || 30000,
    analysisModel: reduxFormData.analysisModel || 'deepseek-r1',
    maxWorkers: validMaxWorkers,
  });

  const [projectLoaded, setProjectLoaded] = useState(false);
  
  // Update projectId in Redux immediately when URL contains projectId
  useEffect(() => {
    if (projectId) {
      dispatch(setProjectId(projectId));
    } else {
      dispatch(setProjectId(null));
    }
  }, [projectId, dispatch]);
  
  // Clear job state when project ID changes to ensure clean state between projects
  // Note: clearJobState was removed as it doesn't exist in the hook
  useEffect(() => {
    if (projectId) {
      // Job state clearing handled automatically by the hook
    }
  }, [projectId]);
  
  // Track if we've tried loading the project and if it exists
  const [projectLoadAttempted, setProjectLoadAttempted] = useState(false);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const formDataRef = useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  
  // Sync local form data with Redux changes (for job parameters loading)
  useEffect(() => {
    const validMaxWorkers = (typeof reduxFormData.maxWorkers === 'number' && reduxFormData.maxWorkers >= 1 && reduxFormData.maxWorkers <= 8)
      ? reduxFormData.maxWorkers
      : 3;
      
    setLocalFormData({
      subreddit: reduxFormData.subreddit || '',
      applicationName: reduxFormData.applicationName || '',
      postLimit: reduxFormData.postLimit || 800,
      sort: reduxFormData.sort || 'relevance',
      timeFilter: reduxFormData.timeFilter || 'all',
      filterType: reduxFormData.filterType || 'cluster',
      keyword: reduxFormData.keyword || '',
      mergeMethod: reduxFormData.mergeMethod || 'deepseek',
      chunkSize: reduxFormData.chunkSize || 30000,
      analysisModel: reduxFormData.analysisModel || 'deepseek-r1',
      maxWorkers: validMaxWorkers,
    });
  }, [reduxFormData]);
  
  // Clear subreddit in Redux when component unmounts
  useEffect(() => {
    return () => {
      // Reset form values and clear analysis data when navigating away
      dispatch(resetFormValues());
      dispatch(clearAnalysisData());
    };
  }, [dispatch]);
  
  // Load projects if needed when accessing a project directly through URL
  useEffect(() => {
    const loadProjects = async () => {
      if (projectId && userProjects.length === 0 && user && !userLoading && !projectLoadAttempted) {
        setProjectLoadAttempted(true);
        try {
          // Attempt to load the user's projects
          await fetchUserProjects(user.id);
        } catch (error) {
          console.error("Error loading user projects:", error);
        }
      }
    };
    
    loadProjects();
  }, [projectId, userProjects, user, userLoading, fetchUserProjects, projectLoadAttempted]);

  // Check if project exists after loading
  useEffect(() => {
    if (projectId && projectLoadAttempted && !userLoading) {
      const projectExists = userProjects.some(project => project.id === projectId);
      setProjectNotFound(!projectExists);
    }
  }, [projectId, userProjects, userLoading, projectLoadAttempted]);

  // Load project data if projectId is provided
  useEffect(() => {
    const loadProjectData = async () => {
      // Add checks for user and user.projects before proceeding
      if (!projectId || projectLoaded || !user || !Array.isArray(user.projects)) {
        // If no projectId, already loaded, user not loaded, or projects not an array, don't proceed yet.
        // If projectId exists but user/projects aren't ready, this effect will re-run when they are.
        return;
      }

      setProjectLoaded(true);

      try {
        // Since loadProjectWithJobStatus doesn't exist, go directly to fallback approach

        // Fallback: Check if project exists in Redux
        const project = user.projects.find(p => p.id === projectId);
        
        if (project && project.data) {
          // If project data exists in Redux, use it
          dispatch(setAnalysisData({
            id: projectId,
            data: project.data as AnalysisData & { ai_summary?: AISummaryResponse | null }
          }));
          
          // Update form data if metadata is available
          if (project.subreddit || project.topic) {
            const currentFormData = formDataRef.current;
            const updatedFormData: AnalysisFormData = {
              ...currentFormData,
              subreddit: project.subreddit || currentFormData.subreddit,
              applicationName: project.topic || currentFormData.applicationName,
              postLimit: project.post_count || currentFormData.postLimit,
              sort: (project.sort_by as "relevance" | "hot" | "top" | "new" | "comments" | undefined) || currentFormData.sort,
              timeFilter: (project.time_period as "hour" | "day" | "week" | "month" | "year" | "all" | undefined) || currentFormData.timeFilter,
              filterType: currentFormData.filterType,
              keyword: currentFormData.keyword,
              mergeMethod: currentFormData.mergeMethod,
              chunkSize: currentFormData.chunkSize,
              analysisModel: currentFormData.analysisModel,
              maxWorkers: currentFormData.maxWorkers
            };
            
            setLocalFormData(updatedFormData);
            dispatch(setFormData(updatedFormData));
          }
        } else {
          // Final fallback: fetch from API using the old method
          console.log(`[SentimentAnalysis] Fetching project ${projectId} from API`);
          const projectData = await userService.getProject(projectId);
          
          if (projectData && projectData.data) {
            // Store in Redux
            dispatch(setAnalysisData({
              id: projectId,
              data: projectData.data as AnalysisData & { ai_summary?: AISummaryResponse | null }
            }));
            
            // Update form data with metadata
            const currentFormData = formDataRef.current;
            const updatedFormData: AnalysisFormData = {
              ...currentFormData,
              subreddit: projectData.subreddit || currentFormData.subreddit,
              applicationName: projectData.topic || currentFormData.applicationName,
              postLimit: projectData.post_count || currentFormData.postLimit,
              sort: (projectData.sort_by as "relevance" | "hot" | "top" | "new" | "comments" | undefined) || currentFormData.sort,
              timeFilter: (projectData.time_period as "hour" | "day" | "week" | "month" | "year" | "all" | undefined) || currentFormData.timeFilter,
              filterType: currentFormData.filterType,
              keyword: currentFormData.keyword,
              mergeMethod: currentFormData.mergeMethod,
              chunkSize: currentFormData.chunkSize,
              analysisModel: currentFormData.analysisModel,
              maxWorkers: currentFormData.maxWorkers
            };
            
            setLocalFormData(updatedFormData);
            dispatch(setFormData(updatedFormData));
          }
        }
      } catch (err: unknown) {
        console.error("Error loading project data:", err);
        // Don't navigate away, just show an error message
      }
    };
    
    loadProjectData();
  }, [projectId, user, dispatch, projectLoaded]);

  const handleSubmit = () => {
    // Validate required fields before proceeding
    if (!formData.subreddit.trim()) {
      setValidationError('Please enter a subreddit name');
      return;
    }
    
    if (!formData.applicationName.trim()) {
      setValidationError('Please enter a topic to analyze');
      return;
    }
    
    // Clear any validation errors
    setValidationError(null);
    clearError(); // Clear any existing analysis errors
    
    // Update Redux with the current form data
    dispatch(setFormData(formData));
    
    // Start analysis with the current project ID
    handleAnalyze(formData, projectId);
  };

  const backgroundColor = '#ffffff';

  // Prepare analysis data for the AnalysisResults component
  let analysisToDisplay: ExtendedAnalysisData | null = null;
  if (analysis) {
    analysisToDisplay = { ...analysis } as ExtendedAnalysisData;
  } else if (
    reduxFormData.data &&
    typeof reduxFormData.data === 'object' &&
    'merged_result' in reduxFormData.data &&
    'formatted_data' in reduxFormData.data
  ) {
    const data = reduxFormData.data as AnalysisData;
    analysisToDisplay = {
      ...data,
      ai_summary: (data as ExtendedAnalysisData).ai_summary
    };
  } else {
    analysisToDisplay = null;
  }

  // Create a string-only version of rawResponse for AnalysisResults component
  const formattedRawResponse = typeof rawResponse === 'string' ? rawResponse : 
    (rawResponse ? JSON.stringify(rawResponse, null, 2) : null);
    
  // Render project not found message if needed
  if (projectNotFound) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
        <div className="w-full py-3 px-6 flex items-center" style={{ backgroundColor }}>
          <div className="flex items-center cursor-pointer" onClick={() => {
            dispatch(resetFormValues());
            navigate('/');
          }}>
            <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
          </div>
          <div className="text-[#141414] font-bold text-2xl mx-auto">Reddit Sentiment Analysis</div>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="bg-white  rounded-lg p-8 max-w-md w-full border border-[#e5e5e5]">
            <div className="flex items-center mb-6">
              <div className="bg-red-500 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#141414]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#141414]">Project Not Found</h2>
            </div>
            <p className="text-[#525252] mb-6">The project you're looking for doesn't exist or may have been deleted.</p>
            <button 
              className="w-full py-3 bg-[#caca20] text-[#141414] rounded-lg hover:brightness-110 transition-colors font-medium"
              onClick={() => {
                dispatch(resetFormValues());
                navigate('/');
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching user projects
  if (userLoading && projectId) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
        <div className="w-full py-3 px-6 flex items-center" style={{ backgroundColor }}>
          <div className="flex items-center cursor-pointer" onClick={() => {
            dispatch(resetFormValues());
            navigate('/');
          }}>
            <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
          </div>
          <div className="text-[#141414] font-bold text-2xl mx-auto">Reddit Sentiment Analysis</div>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-[#141414] text-xl">Loading project data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      <div className="w-full py-3 px-6 flex items-center" style={{ backgroundColor }}>
        <div className="flex items-center cursor-pointer" onClick={() => {
          dispatch(resetFormValues());
          navigate('/');
        }}>
          <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
        </div>
        
        <div className="text-[#141414] font-bold text-2xl mx-auto">
          {projectId ? (formData.subreddit || 'New Project') + (formData.applicationName ? ' - ' + formData.applicationName : '') : 'Reddit Sentiment Analysis'}
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="p-2 bg-[#caca20] text-[#141414] rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors   h-[42px] w-32"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
          
          {analysisToDisplay && (
            <button
              onClick={() => {
                exportToMarkdown(
                  analysisToDisplay,
                  dateFilteredData,
                  projectId,
                  formData.subreddit,
                  formData.applicationName
                );
              }}
               className="p-2 bg-[#115054] text-[#141414] rounded-lg hover:brightness-110 transition-colors   h-[42px]"
            >
              Export to Markdown
            </button>
          )}
          
        </div>
      </div>
      
      {/* Main Content */}
      <div className="pt-3 px-4 pb-6 flex-grow">
        <AnalysisForm
          onSubmit={(data) => handleAnalyze(data, projectId)}
          loading={loading}
          error={validationError || error || userError}
          onClearError={() => {
            setValidationError(null);
            clearError();
          }}
          formData={formData}
          setFormData={(value) => {
            if (typeof value === 'function') {
              setLocalFormData(prev => value(prev));
            } else {
              setLocalFormData(value);
            }
          }}
          projectId={projectId}
        />

        <ErrorBoundary>
          <AnalysisResults
            rawResponse={formattedRawResponse}
            streamedReasoning={streamedReasoning}
            streamedJson={streamedJson}
            loading={loading}
            isThinking={isThinking}
            analysis={analysisToDisplay}
            isPolling={isPolling}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default SentimentAnalysis; 