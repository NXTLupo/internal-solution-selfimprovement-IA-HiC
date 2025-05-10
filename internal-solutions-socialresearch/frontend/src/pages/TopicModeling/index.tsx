import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { TopicModelingForm } from './TopicModelingForm';
import { TopicModelingResults } from './TopicModelingResults';
import { useTopicModeling } from '../../hooks/useTopicModeling';
import { AnalysisFormData } from '../../types/TopicModeling';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setSubreddit, setTopicProject } from '../../store/topicSlice';

function TopicModeling() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const {
    loading,
    error,
    topicData,
    analyzeSubredditTopics
  } = useTopicModeling();

  const [formData, setFormData] = useState<AnalysisFormData>({
    subreddit: 'ouraring',
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

  // Use the URL projectId if available, otherwise use the one from Redux
  const effectiveProjectId = projectId || reduxProjectId;
  
  // Find the current project in the user's projects
  const currentProject = effectiveProjectId 
    ? userProjects.find(p => p.id === effectiveProjectId) 
    : null;
    
  // Extract subreddit from project or project data
  const extractSubredditFromProject = () => {
    if (!currentProject) return null;
    
    // First try at the top level
    if (currentProject.subreddit) {
      return currentProject.subreddit;
    }
    
    // Then try to extract from the data object
    if (currentProject.data) {
      if (currentProject.data.subreddit) {
        return currentProject.data.subreddit;
      }
      
      if (currentProject.data.formatted_data?.subreddit) {
        return currentProject.data.formatted_data.subreddit;
      }
      
      if (currentProject.data.merged_result?.subreddit) {
        return currentProject.data.merged_result.subreddit;
      }
    }
    
    return null;
  };
  
  const projectSubreddit = extractSubredditFromProject();

  // Update Redux state when a project is selected
  useEffect(() => {
    if (effectiveProjectId && currentProject) {
      // Update the Redux state with the project data if available
      if (currentProject.data) {
        dispatch(setTopicProject({
          id: effectiveProjectId,
          data: currentProject.data
        }));
      } else {
        // If project exists but has no data, at least update the projectId and subreddit
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
  }, [effectiveProjectId, currentProject, projectSubreddit, dispatch]);

  // Check for project_id in URL when component mounts
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const projectId = searchParams.get('project_id');
    const subreddit = searchParams.get('subreddit');
    const keyword = searchParams.get('keyword');
    
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
    
    if (projectId || subreddit || keyword) {
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

  // Update URL after successful analysis
  useEffect(() => {
    if (topicData?.analysis_id && !formData.project_id) {
      const keywordParam = formData.keyword ? `&keyword=${encodeURIComponent(formData.keyword)}` : '';
      const newUrl = `${location.pathname}?project_id=${topicData.analysis_id}&subreddit=${formData.subreddit}${keywordParam}`;
      navigate(newUrl, { replace: true });
      
      // Update form data with the new project_id
      setFormData(prev => ({
        ...prev,
        project_id: topicData.analysis_id
      }));
    }
  }, [topicData?.analysis_id, formData.project_id, location.pathname, formData.subreddit, formData.keyword, navigate]);

  const backgroundColor = 'rgba(14,27,39,255)';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      {/* Header */}
      <div className="w-full py-3 px-6 flex items-center border-b border-gray-700" style={{ backgroundColor }}>
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
        <div className="flex items-center">
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
          </div>
        </div>
        </div>
        
        <div className="text-purple-400 font-bold text-xl mx-auto">Reddit Topic Modeling</div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSubmit} 
            disabled={loading || !formData.subreddit}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-blue-500/20 h-[42px] w-32"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
          
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-6 pb-6 flex-grow">
        <TopicModelingForm
          error={error}
          onClearError={() => {/* Add function to clear error */}}
          formData={formData}
          setFormData={setFormData}
          projectId={effectiveProjectId || undefined}
        />

        <ErrorBoundary>
          <TopicModelingResults
            loading={loading}
            topicData={topicData}
            currentSubreddit={formData.subreddit}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default TopicModeling; 