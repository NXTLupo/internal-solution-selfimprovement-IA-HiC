import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setAnalysisData, clearAnalysisData } from '../store/sentimentAnalysisSlice';
import { setTopicProject, clearTopicProject, setStartDate, setEndDate } from '../store/topicSlice';
import { useUser } from '../hooks/useUser';
import { userService } from '../services/user';
import { AnalysisData } from '../types/analysis';
import { TopicData } from '../types/TopicModeling';
import Navigation from '../components/Navigation';
import React from 'react';

// Component to display a project's keyword if available
const TopicKeyword: React.FC<{ projectData: TopicData | AnalysisData | null }> = ({ projectData }) => {
  if (!projectData || typeof projectData !== 'object') {
    return null;
  }
  
  let keyword: string | null = null;
  
  if ('keyword' in projectData) {
    keyword = projectData.keyword as string;
  } 
  // Check other possible structures
  else if ('formatted_data' in projectData && 
          projectData.formatted_data && 
          typeof projectData.formatted_data === 'object' &&
          'keyword' in projectData.formatted_data) {
    keyword = projectData.formatted_data.keyword as string;
  } 
  else if ('merged_result' in projectData && 
          projectData.merged_result && 
          typeof projectData.merged_result === 'object' &&
          'keyword' in projectData.merged_result) {
    keyword = projectData.merged_result.keyword as string;
  }
  
  if (!keyword) return null;
  
  return (
    <>
      <span className="mx-3">•</span>
      <span className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-gray-400">{keyword ? `"${keyword}"` : ""}</span>
      </span>
    </>
  );
};

function Landing() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const backgroundColor = 'rgba(21,31,31,255)';
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);

  // Get user from Redux store
  const user = useSelector((state: RootState) => state.user.currentUser);
  
  // Use our custom hook
  const { deleteProject, fetchUserProjects: fetchUserProjectsFromHook } = useUser();
  
  // Add state for project menu
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  // Add state for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Add this new state to track loaded subreddit icons
  const [subredditIcons, setSubredditIcons] = useState<{[key: string]: string}>({});
  
  // Multi-select state
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Add a ref to track pending fetches to avoid duplicate requests
  const pendingFetches = useRef<Set<string>>(new Set());
  
  // Calculate processing projects count
  const processingProjectsCount = user?.projects.filter(project => 
    project.job_status && project.job_status.status === 'processing'
  ).length || 0;
  
  const isCreateButtonDisabled = processingProjectsCount >= 1;
  
  // Function to fetch user's projects - wrapped in useCallback
  const fetchUserProjects = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    setRetryCountdown(null);
    
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    
    try {
      // Use the userService from the hook instead of implementing our own
      await fetchUserProjectsFromHook(userId);
    } catch (err: unknown) {
      console.error('Error fetching user projects:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Check if it's a server 500 error
      if (errorMessage.includes('Server returned 500')) {
        setError('Failed to load projects: Server is starting up');
        // Start countdown for auto-retry after 20 seconds
        let countdown = 20;
        setRetryCountdown(countdown);
        
        const timer = setInterval(() => {
          countdown -= 1;
          setRetryCountdown(countdown);
          
          if (countdown <= 0) {
            clearInterval(timer);
            if (user) {
              fetchUserProjects(user.id);
            }
          }
        }, 1000);
        
        retryTimerRef.current = timer as unknown as number;
      } else {
        setError(`Failed to load projects: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchUserProjectsFromHook, setLoading, setError, user]); // Include all state setters and user dependency

  // Fetch user's projects on component mount or when user changes
  // Use a ref to prevent repeat calls with the same user ID
  const previousUserIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Only fetch if the user exists and the ID has changed
    if (user && user.id !== previousUserIdRef.current) {
      previousUserIdRef.current = user.id;
      fetchUserProjects(user.id);
    }
  }, [user, fetchUserProjects]); // Keep the dependencies as is

  const handleToolSelect = async (tool: string) => {
    setShowModal(false);
    
    if (!user) {
      console.error("No user found");
      return;
    }
    
    try {
      // Create a new project using the userService
      const data = await userService.createProject(user.id, tool === 'sentiment' ? 'sentiment' : 'topic');
      
      const projectId = data.id;
      
      // Clear the Redux state for the appropriate project type
      if (tool === 'topic') {
        dispatch(clearTopicProject());
      } else if (tool === 'sentiment') {
        dispatch(clearAnalysisData());
      }
      
      // Navigate to the appropriate page with the new project ID
      if (tool === 'sentiment') {
        navigate(`/sentiment-analysis/${projectId}`);
      } else if (tool === 'topic') {
        navigate(`/topic-modeling/${projectId}`);
      }
    } catch (err: unknown) {
      console.error('Error creating project:', err);
      
      // Clear the Redux state for the appropriate project type
      if (tool === 'topic') {
        dispatch(clearTopicProject());
      } else if (tool === 'sentiment') {
        dispatch(clearAnalysisData());
      }
      
      // Fall back to the original navigation without a project ID
      if (tool === 'sentiment') {
        navigate('/sentiment-analysis');
      } else if (tool === 'topic') {
        navigate('/topic-modeling');
      }
    }
  };
  
  const handleProjectClick = (projectId: string, projectType: string) => {
    if (projectType === 'sentiment') {
      // Find the project in the user's projects
      const project = user?.projects.find(p => p.id === projectId);
      
      if (project && project.data) {
        // Add type checking to ensure we only send AnalysisData to the reducer
        if ('merged_result' in project.data && 'formatted_data' in project.data) {
          // Store the project data in Redux
          dispatch(setAnalysisData({
            id: projectId,
            data: project.data as AnalysisData
          }));
        } else {
          console.error('Project data is not in the expected AnalysisData format');
        }
      }
      
      // Navigate to the results page
      navigate(`/sentiment-analysis/${projectId}`);
    } else if (projectType === 'topic') {
      // Find the project in the user's projects
      const project = user?.projects.find(p => p.id === projectId);
            
      if (project && project.data) {
        // Add type checking to ensure we only send TopicData to the reducer
        if ('topics' in project.data && 'total_topics' in project.data) {
          dispatch(setTopicProject({
            id: projectId,
            data: project.data as TopicData
          }));
          // Explicitly update startDate and endDate in Redux
          dispatch(setStartDate(project.startDate ?? undefined));
          dispatch(setEndDate(project.endDate ?? undefined));
        } else {
          console.error('Project data is not in the expected TopicData format');
        }
      }
      
      // Navigate to topic modeling results
      navigate(`/topic-modeling/${projectId}`);
    }
  };

  // Update the fetchSubredditIcon function to better handle the Reddit API response
  const fetchSubredditIcon = async (subreddit: string) => {
    if (!subreddit) return;
    
    // Extract just the subreddit name without any "r/" prefix or additional text
    const cleanSubredditName = subreddit.replace(/^r\//, '').split(' ')[0].split('-')[0].trim();
    
    // Skip API call for "Unnamed" subreddits or if we already have the icon
    // or if a fetch is already in progress
    if (cleanSubredditName === "Unnamed" || 
        cleanSubredditName === "" || 
        subredditIcons[cleanSubredditName] ||
        pendingFetches.current.has(cleanSubredditName)) {
      return;
    }
    
    // Mark this subreddit as being fetched
    pendingFetches.current.add(cleanSubredditName);
    
    try {
      const response = await fetch(`https://www.reddit.com/r/${cleanSubredditName}/about.json`);
      if (response.ok) {
        const data = await response.json();
        
        // First try to get the community icon
        if (data?.data?.community_icon) {
          // Remove any query parameters from the URL
          const iconUrl = data.data.community_icon.split('?')[0];
          setSubredditIcons(prev => ({
            ...prev,
            [cleanSubredditName]: iconUrl
          }));
          return;
        }
        
        // Fall back to icon_img if community_icon is not available
        if (data?.data?.icon_img) {
          const iconUrl = data.data.icon_img.split('?')[0];
          setSubredditIcons(prev => ({
            ...prev,
            [cleanSubredditName]: iconUrl
          }));
          return;
        }
      }
    } catch (error) {
      console.error(`Error fetching icon for r/${cleanSubredditName}:`, error);
    } finally {
      // Remove from pending set when done, whether successful or not
      pendingFetches.current.delete(cleanSubredditName);
    }
  };

  // Handle project menu toggle
  const handleMenuToggle = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent card click
    setActiveMenu(activeMenu === projectId ? null : projectId);
  };

  // Handle delete project
  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent card click
    setActiveMenu(null);
    setShowDeleteConfirm(projectId);
  };

  // Confirm delete project
  const confirmDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setShowDeleteConfirm(null);
    } catch (err: unknown) {
      console.error('Error deleting project:', err);
      // You could set an error state here to show to the user
    }
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSelectAll = () => {
    if (user && user.projects) {
      setSelectedProjects(user.projects.map(p => p.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedProjects([]);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    if (!selectedProjects.length) return;
    try {
      for (const projectId of selectedProjects) {
        await deleteProject(projectId);
      }
      setSelectedProjects([]);
      setShowBulkDeleteConfirm(false);
    } catch (err: unknown) {
      console.error('Error deleting selected projects:', err);
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      <Navigation />

      <div className="p-8 flex-grow pt-16">
        <div className="max-w-screen-2xl mx-auto w-full">
          <h1 className="pb-2 text-5xl font-bold mb-16 mt-8 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Welcome to Social Listening Tools
          </h1>
          
          {/* Debug section - only visible in development */}
          {/* {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-900 rounded text-xs text-gray-400 overflow-auto max-h-40">
              <div>User ID: {user?.id}</div>
              <div>Username: {user?.username}</div>
              <div>Projects count: {user?.projects?.length || 0}</div>
              <div>API Response: {apiResponse ? JSON.stringify(apiResponse).substring(0, 200) + '...' : 'No data'}</div>
              <button 
                onClick={() => user && fetchUserProjects(user.id)}
                className="mt-2 px-2 py-1 bg-blue-800 text-white rounded text-xs"
              >
                Refresh Projects
              </button>
            </div>
          )} */}
          
          <div className="mt-10">
            <div className="mb-10">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl text-white">My Projects</h2>
                  {user && user.projects.length > 0 && (
                    <div className="flex items-center ml-4 space-x-2 bg-gray-800 rounded-full px-2 py-1 shadow-sm">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-900 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition-colors text-sm"
                        disabled={selectedProjects.length === user.projects.length}
                        aria-label="Select All Projects"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Select All
                      </button>
                      <button
                        onClick={handleDeselectAll}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-700 text-white hover:bg-gray-600 focus:ring-2 focus:ring-blue-400 transition-colors text-sm"
                        disabled={selectedProjects.length === 0}
                        aria-label="Deselect All Projects"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        Deselect All
                      </button>
                      {selectedProjects.length > 0 && (
                        <button
                          onClick={handleBulkDelete}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-700 text-white hover:bg-red-800 focus:ring-2 focus:ring-red-400 transition-colors text-sm"
                          aria-label="Delete Selected Projects"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          Delete Selected
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative group">
                  <button
                    onClick={() => !isCreateButtonDisabled && setShowModal(true)}
                    className={`flex items-center px-8 py-3 rounded-full font-medium text-lg transition-colors ${
                      isCreateButtonDisabled 
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                    disabled={isCreateButtonDisabled}
                  >
                    <span className="mr-2">+</span>
                    Create new
                  </button>
                  {isCreateButtonDisabled && (
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div className="text-center">
                        <div className="font-medium">Processing limit reached</div>
                        <div className="text-gray-300">Maximum 1 project can process simultaneously</div>
                        <div className="text-blue-300">Currently processing: {processingProjectsCount}</div>
                      </div>
                      {/* Arrow pointing up */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-700"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-b border-gray-600 border-dashed mt-3 w-full"></div>
            </div>
            
            {loading ? (
              <div className="text-center py-16">
                <div className="text-blue-400 text-xl">Loading projects...</div>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="text-red-400 text-xl mb-4">{error}</div>
                {retryCountdown ? (
                  <div className="flex flex-col items-center">
                    <div className="text-gray-300 mb-3">
                      The app may be waking up from sleep mode to save resources.
                    </div>
                    <div className="text-blue-400 text-xl mb-4">
                      Automatically retrying in {retryCountdown} seconds...
                    </div>
                    <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${(retryCountdown / 20) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => user && fetchUserProjects(user.id)}
                    className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg"
                  >
                    Try Again
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {user && user.projects.length > 0 ? (
                  [...user.projects]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((project, index) => {
                      // Check if project has parameters and is processing
                      const hasParametersAndProcessing = project.parameters && 
                        project.job_status && 
                        project.job_status.status === 'processing';
                      
                      return (
                        <div 
                          key={`project-${project.id}-${index}`}
                          onClick={() => handleProjectClick(project.id, project.type)}
                          className={`bg-gray-800 rounded-lg p-6 relative cursor-pointer hover:bg-gray-700 transition-all duration-300 transform border border-gray-700 overflow-hidden
                            ${selectedProjects.includes(project.id) ? 'ring-4 ring-blue-400 scale-[1.025] shadow-lg' : 'shadow-md'}
                            group
                          `}
                          style={{ transition: 'box-shadow 0.2s, transform 0.2s' }}
                          tabIndex={0}
                          aria-label={`Project card: ${project.name}`}
                        >
                          <button
                            aria-label={selectedProjects.includes(project.id) ? 'Deselect project' : 'Select project'}
                            onClick={e => { e.stopPropagation(); handleProjectSelect(project.id); }}
                            className={`absolute top-4 right-4 z-20 w-7 h-7 flex items-center justify-center rounded-full border-2 border-transparent
                              bg-transparent shadow-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400
                              hover:border-blue-400
                            `}
                            tabIndex={0}
                          >
                            <span
                              className={`flex items-center justify-center w-4 h-4 rounded-full border-2
                                ${selectedProjects.includes(project.id) ? 'bg-blue-500 border-blue-600' : 'bg-gray-900 border-gray-500'}
                                transition-all duration-150
                              `}
                            >
                              {selectedProjects.includes(project.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </span>
                          </button>
                          
                          <div className={`absolute top-4 left-4 px-4 py-1 text-sm rounded-full font-medium ${
                            project.type === 'sentiment' 
                              ? 'bg-cyan-900/60 text-cyan-900 border border-cyan-700' 
                              : 'bg-purple-900/60 text-purple-200 border border-purple-700'
                          }`}>
                            {project.type === 'sentiment' ? 'Social LLM Analyzer' : 'Topic modeling'}
                          </div>
                          
                          <div className="absolute top-4 right-4 z-10">
                            <button 
                              onClick={(e) => handleMenuToggle(e, project.id)}
                              className="p-1 text-gray-400 hover:text-white focus:outline-none"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            
                            {activeMenu === project.id && (
                              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5 z-20">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                  <button
                                    onClick={(e) => handleDeleteClick(e, project.id)}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                                    role="menuitem"
                                  >
                                    Delete Project
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Colored accent line based on project type */}
                          <div className={`absolute top-0 left-0 w-full h-1.5 ${
                            project.type === 'sentiment' ? 'bg-cyan-900' : 'bg-purple-500'
                          }`}></div>
                          
                          {/* Subreddit icon - adjusted top margin to account for the type indicator */}
                          <div className="flex items-center mb-3 mt-12">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center mr-4 flex-shrink-0">
                              {(() => {
                                // If has parameters and is processing, use parameters data
                                if (hasParametersAndProcessing && project.parameters?.subreddit) {
                                  const subredditName = project.parameters.subreddit;
                                  return (
                                    <img 
                                      src={subredditIcons[subredditName] || 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png'}
                                      alt={`Icon for r/${subredditName}`}
                                      className="w-full h-full object-cover"
                                      onLoad={() => {
                                        fetchSubredditIcon(subredditName);
                                      }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png';
                                      }}
                                    />
                                  );
                                }
                                
                                // Otherwise, use existing project name logic
                                const projectName = project.name || 'Unknown';
                                const subredditName = projectName.split(' ')[0].replace(/^r\//, '').split('-')[0].trim();
                                
                                if (subredditName && subredditName !== "Unnamed" && subredditName !== "") {
                                  return (
                                    <img 
                                      src={subredditIcons[subredditName] || 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png'}
                                      alt={`Icon for r/${subredditName}`}
                                      className="w-full h-full object-cover"
                                      onLoad={() => {
                                        fetchSubredditIcon(subredditName);
                                      }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png';
                                      }}
                                    />
                                  );
                                } else {
                                  return (
                                    <img 
                                      src="https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png"
                                      alt="Reddit icon"
                                      className="w-full h-full object-cover"
                                    />
                                  );
                                }
                              })()}
                            </div>
                            <h3 className={`font-semibold text-white pr-12 truncate ${
                              (() => {
                                // If has parameters and is processing, show subreddit from parameters
                                if (hasParametersAndProcessing && project.parameters?.subreddit) {
                                  const displayName = `r/${project.parameters.subreddit}${project.parameters.keyword ? ` - ${project.parameters.keyword}` : ''}`;
                                  return displayName.length > 22 ? 'text-lg' : 'text-xl';
                                }
                                
                                // Otherwise, use existing project name
                                const displayName = project.name || 'Unknown Project';
                                return displayName.length > 22 ? 'text-lg' : 'text-xl';
                              })()
                            }`}>
                              {(() => {
                                // If has parameters and is processing, show subreddit from parameters
                                if (hasParametersAndProcessing && project.parameters?.subreddit) {
                                  return `r/${project.parameters.subreddit}${project.parameters.keyword ? ` - ${project.parameters.keyword}` : ''}`;
                                }
                                
                                // Otherwise, use existing project name
                                return project.name || 'Unknown Project';
                              })()}
                            </h3>
                          </div>
                          
                          <div className="mt-5 text-gray-400 text-base flex items-center flex-wrap">
                            <span className="mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </span>
                            {new Date(project.created_at).toLocaleDateString()} 
                            
                            {/* Display processing status after date - only if has parameters and is processing */}
                            {hasParametersAndProcessing && (
                              <>
                                <span className="mx-3">•</span>
                                <span className="flex items-center text-blue-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Processing...
                                </span>
                              </>
                            )}
                            {project.type === 'topic' && (
                              <TopicKeyword projectData={project.data as TopicData | AnalysisData || null} />
                            )}
                          </div>
                          
                          {/* View button */}
                          <div className="mt-6 text-right">
                            <span className={`inline-block px-4 py-2 text-sm rounded-full ${
                              project.type === 'sentiment' 
                                ? 'bg-cyan-900/30 text-cyan-900 hover:bg-cyan-800/50' 
                                : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/50'
                            } transition-colors`}>
                              View Details →
                            </span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="col-span-full text-center py-16 text-gray-400 bg-gray-800/50 rounded-lg border border-dashed border-gray-700 p-10">
                    
                    <div className="text-2xl font-medium mb-4">No projects yet</div>
                    <div className="text-gray-500 mb-8 text-lg">Create a new project to get started with your analysis</div>
                    <div className="relative inline-block group">
                      <button
                        onClick={() => !isCreateButtonDisabled && setShowModal(true)}
                        className={`px-8 py-3 rounded-full font-medium text-lg transition-colors ${
                          isCreateButtonDisabled 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        disabled={isCreateButtonDisabled}
                        title={isCreateButtonDisabled ? `Maximum of 1 project can be processing simultaneously. Currently processing: ${processingProjectsCount}` : ''}
                      >
                        + Create New Project
                      </button>
                      {isCreateButtonDisabled && (
                        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="text-center">
                            <div className="font-medium">Processing limit reached</div>
                            <div className="text-gray-300">Maximum 1 project can process simultaneously</div>
                            <div className="text-blue-300">Currently processing: {processingProjectsCount}</div>
                          </div>
                          {/* Arrow pointing up */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-700"></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tool Selection Modal - Made larger */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-gray-800 rounded-lg p-8 w-[550px] shadow-xl max-w-full relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl text-white font-medium">Select a Tool</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-8">
                <button
                  onClick={() => handleToolSelect('topic')}
                  className="w-full p-6 bg-purple-700 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-start"
                >
                  <span className="mr-5 text-4xl mt-1">🔍</span>
                  <div className="text-left">
                    <div className="font-medium text-xl mb-2">Topic Modeling</div>
                    <div className="text-base">
                      <p className="mb-2">For researchers who want to discover what topics are being discussed.</p>
                      <p>Identifies the main themes and subjects that users are talking about, helping you uncover trends and popular discussions.</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleToolSelect('sentiment')}
                  className="w-full p-6 bg-cyan-700 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-start"
                >
                  <span className="mr-5 text-4xl mt-1">📊</span>
                  <div className="text-left">
                    <div className="font-medium text-xl mb-2">Social LLM Analyzer</div>
                    <div className="text-base">
                      <p className="mb-2">For researchers who already know their topic of interest.</p>
                      <p>Analyzes user sentiment (positive/negative) towards specific topics, providing traceable data to understand the nuances and emotional tone of discussions.</p>
                    </div>
                  </div>
                </button>            
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-[400px] shadow-xl max-w-full relative">
              <h3 className="text-xl text-white font-medium mb-4">Delete Project</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this project? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDeleteProject(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-[400px] shadow-xl max-w-full relative">
              <h3 className="text-xl text-white font-medium mb-4">Delete Selected Projects</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete {selectedProjects.length} selected project{selectedProjects.length > 1 ? 's' : ''}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Landing; 