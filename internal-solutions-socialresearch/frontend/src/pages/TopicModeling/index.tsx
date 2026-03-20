import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { TopicModelingForm } from './TopicModelingForm';
import { TopicModelingResults } from './TopicModelingResults';
import { useTopicModeling } from '../../hooks/useTopicModeling';
import { useUser } from '../../hooks/useUser';
import { AnalysisFormData, TopicData } from '../../types/TopicModeling';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setSubreddit, resetSubreddit, setTopicProject, setStartDate, setEndDate } from '../../store/topicSlice';
import { exportTopicModelingAsTXT, exportTopicModelingAsJSON, exportTopicModelingAsMarkdown, exportTopicModelingAsXML } from './exportUtils';
import { Download, ChevronDown } from 'lucide-react';

function TopicModeling() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { fetchUserProjects, loading: userLoading, error: userError} = useUser();
  
  const {
    loading: topicLoading,
    error: topicError,
    topicData,
    analyzeSubredditTopics,
    jobProgress,
    jobMessage,
    loadProjectWithJobStatus,
    clearJobState
  } = useTopicModeling();

  const [formData, setFormData] = useState<AnalysisFormData>({
    subreddit: '',
    timeFilter: 'all',
    sort: 'hot',
    keyword: ''
  });

  // Get project ID from URL if available
  const { projectId } = useParams<{ projectId?: string }>();

  // Get project ID from Redux
  const reduxProjectId = useSelector((state: RootState) => state.topic.projectId);
  
  // Get user projects from Redux 
  const userProjects = useSelector((state: RootState) => state.user.currentUser?.projects || []);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  // Use the URL projectId if available, otherwise use the one from Redux
  const effectiveProjectId = projectId || reduxProjectId;
  
  // Clear job state when project ID changes to ensure clean state between projects
  useEffect(() => {
    clearJobState();
  }, [effectiveProjectId, clearJobState]);
  
  // Track if we've tried loading the project
  const [projectLoadAttempted, setProjectLoadAttempted] = useState(false);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Load projects if needed when accessing a project directly through URL
  useEffect(() => {
    const loadProjects = async () => {
      // Only load if we have a URL project ID (not Redux), ensuring we don't interfere with new analysis creation
      if (projectId && currentUser && !userLoading && !projectLoadAttempted) {
        setProjectLoadAttempted(true);
        try {
          // Use the new function that handles job status for direct project access
          const project = await loadProjectWithJobStatus(projectId);
          
          // If the project wasn't found or we need to load all projects, try fetching all
          if (!project || userProjects.length === 0) {
            await fetchUserProjects(currentUser.id);
          }
        } catch (error) {
          console.error("Error loading project data:", error);
          // For projects that don't exist, try fetching all projects
          if (userProjects.length === 0) {
            try {
              await fetchUserProjects(currentUser.id);
            } catch (fallbackError) {
              console.error("Error fetching user projects as fallback:", fallbackError);
            }
          }
        }
      }
    };

    loadProjects();
  }, [projectId, userProjects, currentUser, userLoading, fetchUserProjects, loadProjectWithJobStatus, projectLoadAttempted]);

  // Check if project exists after loading
  useEffect(() => {
    // Only check if project exists when we have a project ID from URL params (not Redux)
    // This prevents false positives when creating new analyses
    if (projectId && projectLoadAttempted && !userLoading) {
      const projectExists = userProjects.some(project => project.id === projectId);
      setProjectNotFound(!projectExists);
    } else {
      // Reset project not found state when there's no URL project ID
      setProjectNotFound(false);
    }
  }, [projectId, userProjects, userLoading, projectLoadAttempted]);
  
  // Find the current project in the user's projects
  const currentProject = effectiveProjectId 
    ? userProjects.find(p => p.id === effectiveProjectId) 
    : null;
    
  // Extract subreddit from project or project data
  const extractSubredditFromProject = () => {
    if (!currentProject) return null;
    
    // First try at the top level - this is common for both TopicData and AnalysisData projects
    if (currentProject.subreddit) {
      return currentProject.subreddit;
    }
    
    return null;
  };
  
  const projectSubreddit = extractSubredditFromProject();

  // Update Redux state when a project is selected
  useEffect(() => {
    if (effectiveProjectId && currentProject) {
      const projectStartDate = currentProject.startDate;
      const projectEndDate = currentProject.endDate;
      // Update the form data with the project dates if available
      if (projectStartDate || projectEndDate) {
        setFormData(prev => ({
          ...prev,
          startDate: projectStartDate || prev.startDate,
          endDate: projectEndDate || prev.endDate
        }));
      }
      
      // Update the Redux state with the project data if available
      if (currentProject.data) {
        // Check if it's a TopicData by looking for topic-specific fields
        const isTopicData = 'topics' in currentProject.data && 'total_topics' in currentProject.data;
        
        if (isTopicData) {
          // Create a new data object with the project-level dates
          const dataWithProjectDates = {
            ...currentProject.data,
            // Ensure the dates from the project are preserved
            startDate: projectStartDate,
            endDate: projectEndDate
          };
          
          dispatch(setTopicProject({
            id: effectiveProjectId,
            data: dataWithProjectDates as TopicData
          }));
          
          // Also update the Redux store date fields directly
          if (projectStartDate) {
            dispatch(setStartDate(projectStartDate));
          }
          if (projectEndDate) {
            dispatch(setEndDate(projectEndDate));
          }
        } else {
          // If it's not TopicData, just update the project ID
          dispatch(setTopicProject({
            id: effectiveProjectId,
            data: null
          }));
        }
      } else {
        // If project exists but has no data, at least update the projectId
        dispatch(setTopicProject({
          id: effectiveProjectId,
          data: null
        }));
      }
      
      // Update subreddit in Redux if available
      if (projectSubreddit) {
        dispatch(setSubreddit(projectSubreddit));
      }
    }
  }, [effectiveProjectId, currentProject, projectSubreddit, dispatch, setFormData]);

  // Check for project_id in URL when component mounts
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const projectId = searchParams.get('project_id');
    const subreddit = searchParams.get('subreddit');
    const keyword = searchParams.get('keyword');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const updatedFormData = {...formData};
    
    if (projectId) {
      updatedFormData.project_id = projectId;
    }
    
    if (subreddit) {
      updatedFormData.subreddit = subreddit;
    }
    
    if (keyword) {
      updatedFormData.keyword = keyword;
    }
    
    if (startDate) {
      updatedFormData.startDate = startDate;
    }
    
    if (endDate) {
      updatedFormData.endDate = endDate;
    }
    
    if (projectId || subreddit || keyword || startDate || endDate) {
      setFormData(updatedFormData);
    }
    
    // Auto-analyze if both project_id and subreddit are provided
    if (projectId && subreddit) {
      analyzeSubredditTopics(updatedFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, analyzeSubredditTopics]);

  // Update formData when the current project changes
  useEffect(() => {
    if (projectSubreddit && projectSubreddit !== formData.subreddit) {
      setFormData(prev => ({
        ...prev,
        subreddit: projectSubreddit
      }));
    }
  }, [currentProject, formData.subreddit, projectSubreddit]);

  // Update handleSubmit to include project_id
  const handleSubmit = () => {
    analyzeSubredditTopics(formData);
  };

  // Handle export functionality
  const handleExport = (format: 'txt' | 'json' | 'markdown' | 'xml') => {
    if (!topicData || !formData.subreddit) {
      alert('No topic data available to export');
      return;
    }
    
    const exportData = {
      topicData,
      subreddit: formData.subreddit
    };
    
    switch (format) {
      case 'txt':
        exportTopicModelingAsTXT(exportData);
        break;
      case 'json':
        exportTopicModelingAsJSON(exportData);
        break;
      case 'markdown':
        exportTopicModelingAsMarkdown(exportData);
        break;
      case 'xml':
        exportTopicModelingAsXML(exportData);
        break;
    }
    
    setShowExportDropdown(false);
  };

  // Update URL after successful analysis
  useEffect(() => {
    if (topicData?.analysis_id && !formData.project_id) {
      // Build URL params
      const params = [
        `project_id=${topicData.analysis_id}`,
        `subreddit=${encodeURIComponent(formData.subreddit)}`
      ];
      
      if (formData.keyword) {
        params.push(`keyword=${encodeURIComponent(formData.keyword)}`);
      }
      
      if (formData.startDate) {
        params.push(`startDate=${encodeURIComponent(formData.startDate)}`);
      }
      
      if (formData.endDate) {
        params.push(`endDate=${encodeURIComponent(formData.endDate)}`);
      }
      
      const newUrl = `${location.pathname}?${params.join('&')}`;
      navigate(newUrl, { replace: true });
      
      // Update form data with the new project_id
      setFormData(prev => ({
        ...prev,
        project_id: topicData.analysis_id
      }));
    }
  }, [topicData?.analysis_id, formData.project_id, location.pathname, formData.subreddit, formData.keyword, formData.startDate, formData.endDate, navigate]);

  // Clear subreddit in Redux when component unmounts
  useEffect(() => {
    return () => {
      // Reset subreddit to empty string when navigating away
      dispatch(resetSubreddit());
    };
  }, [dispatch]);

  // Handle clicking outside the export dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const backgroundColor = '#ffffff';

  // Render project not found message if needed
  if (projectNotFound) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
        <div className="w-full py-3 px-6 flex items-center border-b border-[#e5e5e5]" style={{ backgroundColor }}>
          <div className="flex items-center cursor-pointer" onClick={() => {
            dispatch(resetSubreddit());
            navigate('/');
          }}>
            <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
          </div>
          <div className="text-[#115054] font-bold text-xl mx-auto">Reddit Topic Modeling</div>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full border border-[#e5e5e5]">
            <div className="flex items-center mb-6">
              <div className="bg-red-500 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#141414]">Project Not Found</h2>
            </div>
            <p className="text-[#525252] mb-6">The project you're looking for doesn't exist or may have been deleted.</p>
            <button
              className="w-full py-3 bg-[#caca20] text-[#115054] rounded-lg hover:brightness-110 transition-colors font-medium"
              onClick={() => {
                dispatch(resetSubreddit());
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
        <div className="w-full py-3 px-6 flex items-center border-b border-[#e5e5e5]" style={{ backgroundColor }}>
          <div className="flex items-center cursor-pointer" onClick={() => {
            dispatch(resetSubreddit());
            navigate('/');
          }}>
            <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
          </div>
          <div className="text-[#115054] font-bold text-xl mx-auto">Reddit Topic Modeling</div>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-[#141414] text-xl">Loading project data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      {/* Header */}
      <div className="w-full py-3 px-6 flex items-center border-b border-[#e5e5e5]" style={{ backgroundColor }}>
        <div className="flex items-center cursor-pointer" onClick={() => {
          dispatch(resetSubreddit());
          navigate('/');
        }}>
          <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
        </div>
        
        <div className="text-[#115054] font-bold text-xl mx-auto">Reddit Topic Modeling</div>
        
        <div className="flex items-center gap-4">
          {!topicData && (
            <button 
              onClick={handleSubmit} 
              disabled={topicLoading || !formData.subreddit}
              className="p-2 bg-[#caca20] text-[#115054] rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-[42px] w-32"
            >
              {topicLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          )}
          
          {topicData && (
            <>
              <button
                onClick={() => {
                  if (formData.subreddit) {
                    navigate(`/reddit-browser/subreddit/${formData.subreddit}`);
                  }
                }}
                disabled={!formData.subreddit}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-green-500/20 h-[42px] w-45 flex items-center justify-center"
                title={formData.subreddit ? `Browse and export r/${formData.subreddit} posts and comments` : 'Select a subreddit to browse and export data'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Browse r/{formData.subreddit} Data
              </button>
              
              <div className="relative export-dropdown">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="p-2 bg-[#f5f5f5] text-[#141414] rounded-lg hover:bg-[#e5e5e5] transition-colors h-[42px] flex items-center justify-center"
                  title="Export topic modeling results"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e5e5e5] rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('txt')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export as TXT
                      </button>
                      <button
                        onClick={() => handleExport('json')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707L16.414 6.293A1 1 0 0015.586 6H7a2 2 0 00-2 2v11a2 2 0 002 2z" />
                        </svg>
                        Export as JSON
                      </button>
                      <button
                        onClick={() => handleExport('xml')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Export as XML
                      </button>
                      <button
                        onClick={() => handleExport('markdown')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export as Markdown
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-6 pb-6 flex-grow">
        <TopicModelingForm
          error={topicError || userError}
          onClearError={() => {/* Add function to clear error */}}
          formData={formData}
          setFormData={setFormData}
          projectId={effectiveProjectId || undefined}
        />

        <ErrorBoundary>
          <TopicModelingResults
            loading={topicLoading}
            topicData={topicData}
            currentSubreddit={formData.subreddit}
            jobProgress={jobProgress}
            jobMessage={jobMessage}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default TopicModeling; 